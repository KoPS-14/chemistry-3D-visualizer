# Fine-Tuning Chem-AI Qwen Model on Google Colab

Since you don't have a local GPU, Google Colab is the absolute best way to train the model for free. We will use the **Unsloth** library, which is heavily optimized to train models 2x faster and use 70% less memory on Colab's free T4 GPUs.

### Step 1: Prepare your Colab Environment
1. Go to [Google Colab](https://colab.research.google.com/) and click **New Notebook**.
2. In the top menu, go to **Runtime > Change runtime type**.
3. Select **T4 GPU** and click Save.
4. On the left sidebar of the screen, click the **Folder icon** (Files). Upload the `dataset.jsonl` file we generated in your backend folder.

### Step 2: The Training Code

Create new code cells in your notebook and paste the following code into each cell. Run them one by one.

#### Cell 1: Install Dependencies
```python
# Install Unsloth and other required training libraries
!pip install "unsloth[colab] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps "xformers<0.0.27" "trl<0.9.0" peft accelerate bitsandbytes
```

#### Cell 2: Load the Model
```python
from unsloth import FastLanguageModel
import torch

# We load the Unsloth optimized version of Qwen2.5-3B
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name = "unsloth/Qwen2.5-3B", 
    max_seq_length = 2048,
    dtype = None,
    load_in_4bit = True, # Compresses the model so it fits on the free GPU
)

# Add LoRA adapters (this tells the model which specific "brain" parts we want to train)
model = FastLanguageModel.get_peft_model(
    model,
    r = 16,
    target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                      "gate_proj", "up_proj", "down_proj",],
    lora_alpha = 16,
    lora_dropout = 0,
    bias = "none",
    use_gradient_checkpointing = "unsloth",
    random_state = 3407,
)
```

#### Cell 3: Load and Format our Dataset
```python
from datasets import load_dataset

# Load the dataset.jsonl you uploaded
dataset = load_dataset("json", data_files="dataset.jsonl", split="train")

# Format the JSON data into Qwen's ChatML conversational format
def format_chatml(example):
    messages = example["messages"]
    text = ""
    for msg in messages:
        if msg["role"] == "system":
            text += f"<|im_start|>system\n{msg['content']}<|im_end|>\n"
        elif msg["role"] == "user":
            text += f"<|im_start|>user\n{msg['content']}<|im_end|>\n"
        elif msg["role"] == "assistant":
            text += f"<|im_start|>assistant\n{msg['content']}<|im_end|>\n"
    return {"text": text}

dataset = dataset.map(format_chatml)
```

#### Cell 4: Run the Training!
```python
from trl import SFTTrainer
from transformers import TrainingArguments

trainer = SFTTrainer(
    model = model,
    tokenizer = tokenizer,
    train_dataset = dataset,
    dataset_text_field = "text",
    max_seq_length = 2048,
    args = TrainingArguments(
        per_device_train_batch_size = 2,
        gradient_accumulation_steps = 4,
        warmup_steps = 5,
        max_steps = 60, # Trains for 60 steps (very fast)
        learning_rate = 2e-4,
        fp16 = not torch.cuda.is_bf16_supported(),
        bf16 = torch.cuda.is_bf16_supported(),
        logging_steps = 1,
        optim = "adamw_8bit",
        weight_decay = 0.01,
        lr_scheduler_type = "linear",
        seed = 3407,
        output_dir = "outputs",
    ),
)

# Start training (This will take about 5-10 minutes)
trainer_stats = trainer.train()
```

#### Cell 5: Export for Ollama
```python
# Unsloth will merge the new chemistry knowledge into the model and convert it to a GGUF file
# This file is exactly what Ollama needs to run the model locally.
model.save_pretrained_gguf("chem-qwen-model", tokenizer, quantization_method = "q4_k_m")
```

### Step 3: Download and Integrate
1. Once Cell 5 finishes, a folder named `chem-qwen-model` will appear in your Colab files.
2. Download the `.gguf` file inside it to your computer.
3. We will then load that file into your local Ollama! Let me know when you have downloaded it.
