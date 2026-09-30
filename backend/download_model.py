from huggingface_hub import snapshot_download
import time
import sys

def main():
    model_id = "Qwen/Qwen2.5-3B"
    print(f"Starting download of {model_id} from HuggingFace...")
    print("This involves downloading several gigabytes of raw model weights.")
    print("Please be patient, this may take a while depending on your internet connection...\n")
    
    start_time = time.time()
    try:
        # snapshot_download downloads the entire repo to the local huggingface cache
        path = snapshot_download(repo_id=model_id)
        
        elapsed = time.time() - start_time
        print(f"\n✅ SUCCESS! Download complete in {elapsed:.2f} seconds.")
        print(f"Model weights are safely stored in your HuggingFace cache at:\n{path}")
    except Exception as e:
        print(f"\n❌ ERROR during download: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
