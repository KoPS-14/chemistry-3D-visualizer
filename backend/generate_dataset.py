import json
import random

SYSTEM_PROMPT = (
    "You are a chemistry structure translator. Output ONLY valid JSON matching schema:\n"
    "For molecule: {\"request_type\": \"molecule\", \"name\": \"name\", \"smiles\": \"SMILES\", \"confidence\": 0.95}\n"
    "For reaction: {\"request_type\": \"reaction\", \"reaction_type\": \"SN2\", \"reactants\": [], \"products\": [], \"confidence\": 0.90}"
)

# A small subset of examples to programmatically expand
MOLECULES = [
    ("water", "Water", "O"),
    ("h2o", "Water", "O"),
    ("ethanol", "Ethanol", "CCO"),
    ("methane", "Methane", "C"),
    ("co2", "Carbon dioxide", "O=C=O"),
    ("carbon dioxide", "Carbon dioxide", "O=C=O"),
    ("benzene", "Benzene", "c1ccccc1"),
    ("aspirin", "Aspirin", "CC(=O)Oc1ccccc1C(=O)O"),
    ("ammonia", "Ammonia", "N"),
    ("glucose", "Glucose", "C(C1C(C(C(C(O1)O)O)O)O)O")
]

REACTIONS = [
    {
        "query": "Show me an SN2 reaction between methyl bromide and hydroxide",
        "output": {
            "request_type": "reaction",
            "name": "sn2_ch3br_oh",
            "reaction_type": "sn2",
            "reactants": [{"name": "Methyl bromide", "smiles": "CBr", "role": "electrophile"}, {"name": "Hydroxide", "smiles": "[OH-]", "role": "nucleophile"}],
            "products": [{"name": "Methanol", "smiles": "CO", "role": "product"}, {"name": "Bromide", "smiles": "[Br-]", "role": "leaving_group"}],
            "confidence": 0.98
        }
    },
    {
        "query": "acid base neutralization of HCl and Ammonia",
        "output": {
            "request_type": "reaction",
            "name": "acid_base_hcl_ammonia",
            "reaction_type": "acid_base",
            "reactants": [{"name": "Hydrochloric acid", "smiles": "Cl", "role": "acid"}, {"name": "Ammonia", "smiles": "N", "role": "base"}],
            "products": [{"name": "Ammonium", "smiles": "[NH4+]", "role": "conjugate_acid"}, {"name": "Chloride", "smiles": "[Cl-]", "role": "conjugate_base"}],
            "confidence": 0.96
        }
    }
]

OOD_QUERIES = [
    "What is the capital of France?",
    "Write a Python script to scrape a website.",
    "Who won the World Cup in 2022?",
    "Can you give me a recipe for chocolate cake?",
    "Explain the theory of relativity.",
    "Translate this sentence to Spanish: I love you.",
    "How do I fix my car's engine?",
    "Tell me a joke.",
    "What is the best way to invest in stocks?",
    "Write a poem about the moon."
]

PROMPT_TEMPLATES = [
    "Show me {query}",
    "Render {query}",
    "Generate 3D model for {query}",
    "What is the structure of {query}?",
    "{query}"
]

def generate_data():
    dataset = []
    
    # Generate Molecule queries
    for q_name, proper_name, smiles in MOLECULES:
        for template in PROMPT_TEMPLATES:
            user_msg = template.format(query=q_name)
            assistant_msg = json.dumps({
                "request_type": "molecule",
                "name": proper_name,
                "smiles": smiles,
                "confidence": round(random.uniform(0.95, 0.99), 2)
            })
            
            dataset.append({
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                    {"role": "assistant", "content": assistant_msg}
                ]
            })

    # Generate Reaction queries
    for rxn in REACTIONS:
        for template in PROMPT_TEMPLATES:
            user_msg = template.format(query=rxn["query"].lower().replace("show me an ", ""))
            assistant_msg = json.dumps(rxn["output"])
            
            dataset.append({
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                    {"role": "assistant", "content": assistant_msg}
                ]
            })

    # Generate Out-Of-Domain (Rejection) queries
    for q in OOD_QUERIES:
        assistant_msg = json.dumps({
            "request_type": "error",
            "message": "I am an AI specialized strictly in Chemistry. I cannot answer non-chemistry questions."
        })
        dataset.append({
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": q},
                {"role": "assistant", "content": assistant_msg}
            ]
        })
            
    # Shuffle dataset
    random.shuffle(dataset)
    return dataset

def main():
    print("Generating synthetic chemistry dataset...")
    data = generate_data()
    
    output_file = "dataset.jsonl"
    with open(output_file, "w", encoding="utf-8") as f:
        for item in data:
            f.write(json.dumps(item) + "\n")
            
    print(f"SUCCESS! Successfully generated {len(data)} training examples.")
    print(f"Dataset saved to {output_file}")

if __name__ == "__main__":
    main()
