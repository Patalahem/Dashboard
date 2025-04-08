import argparse
from detect_airplane import run_detection as detect_airplanes
from detect_ship import run_detection as detect_ships
from detect_combined import run_combined

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", required=True, help="Path to the image")
    parser.add_argument("--mode", choices=["airplane", "ship", "both"], default="airplane", help="Detection mode")
    args = parser.parse_args()

    if args.mode == "airplane":
        print("✈️ Running airplane detection...")
        result = detect_airplanes(args.image)
    elif args.mode == "ship":
        print("🚢 Running ship detection...")
        result = detect_ships(args.image)
    elif args.mode == "both":
        print("🔄 Running combined model detection...")
        result = run_combined(args.image)

    print(f"✅ Detections ({len(result['detections'])} total):")
    for det in result["detections"]:
        print(det)

    print(f"\n📄 Annotated image saved at: {result['annotated_path']}")

if __name__ == "__main__":
    main()
