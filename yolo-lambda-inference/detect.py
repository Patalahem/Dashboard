import argparse 
from detect_airplane          import run_detection as detect_airplanes
from detect_ship              import run_detection as detect_ships
from detect_combined          import run_combined
from detect_combined_model    import run_detection as detect_combined_model

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--image", 
        required=True, 
        help="Path to the image"
    )
    parser.add_argument(
        "--mode", 
        choices=["airplane", "ship", "both", "combinedModel"], 
        default="airplane", 
        help="Detection mode"
    )
    args = parser.parse_args()

    if args.mode == "airplane":
        print("✈️  Running airplane detection...")
        result = detect_airplanes(args.image)
    elif args.mode == "ship":
        print("🚢  Running ship detection...")
        result = detect_ships(args.image)
    elif args.mode == "both":
        print("🔄  Running combined (two-model) detection...")
        result = run_combined(args.image)
    else:  # combinedModel
        print("🔀  Running single combined.pt detection...")
        result = detect_combined_model(args.image)

    print(f"\n✅ Detections ({len(result['detections'])} total):")
    for det in result["detections"]:
        print(det)

    print(f"\n📄 Annotated image saved at: {result['annotated_path']}")
    # new:
    if "json_path" in result:
        print(f"📑 JSON detections saved at: {result['json_path']}")

if __name__ == "__main__":
    main()
