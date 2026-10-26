# Lambda handler (HTTP API payload v2.0): GET /drugs = อ่านทั้งตาราง · POST /drugs = เพิ่ม/แก้ 1 รายการ
import json
import os
import uuid

import boto3

table = boto3.resource("dynamodb").Table(os.environ["TABLE_NAME"])


def reply(status, body):
    return {"statusCode": status, "headers": {"content-type": "application/json"}, "body": json.dumps(body, default=str)}


def handler(event, context):
    method = event["requestContext"]["http"]["method"]
    print(f"{method} {event['rawPath']} env={os.environ.get('APP_ENV')}")
    if method == "GET":
        items = table.scan()["Items"]
        return reply(200, {"env": os.environ.get("APP_ENV"), "function": context.function_name, "count": len(items), "items": items})
    if method == "POST":
        try:
            item = json.loads(event.get("body") or "")
        except ValueError:
            return reply(400, {"message": "invalid json body"})
        item.setdefault("id", uuid.uuid4().hex[:8])
        table.put_item(Item=item)
        return reply(201, {"id": item["id"], "function": context.function_name})
    return reply(404, {"message": "not found"})
