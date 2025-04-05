from detect import run_detection

def lambda_handler(event, context):
    return run_detection(event)