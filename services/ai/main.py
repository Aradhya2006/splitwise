from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image
import io
import re
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Split.ai OCR Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set tesseract path for Windows
pytesseract.pytesseract.tesseract_cmd = os.getenv(
    'TESSERACT_PATH', 
    r'C:\Program Files\Tesseract-OCR\tesseract.exe'
)

@app.get("/")
def root():
    return {"status": "Split.ai OCR service running", "version": "1.0.0"}

@app.post("/parse-bill")
async def parse_bill(file: UploadFile = File(...)):
    try:
        # Read image
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        # OCR — extract raw text
        raw_text = pytesseract.image_to_string(image)
        print("Raw OCR text:\n", raw_text)

        # Parse the text
        result = parse_bill_text(raw_text)
        result["raw_text"] = raw_text

        return result

    except Exception as e:
        return {"error": str(e)}

def parse_bill_text(text):
    lines = text.strip().split('\n')
    items = []
    cgst = 0.0
    sgst = 0.0
    service_charge = 0.0
    subtotal = 0.0
    total = 0.0

    # Patterns
    # Matches numbers with exactly two decimals, optionally with thousand separators: 12.50, 1,234.50, 12,50
    price_pattern = re.compile(r'(\d+(?:[.,]\d{3})*[.,]\d{2})')
    tax_keywords = ['cgst', 'sgst', 'gst', 'tax', 'vat']
    service_keywords = ['service charge', 'service', 'srv chg']
    skip_keywords = ['subtotal', 'sub total', 'total', 'bill', 
                     'thank', 'welcome', 'table', 'date', 
                     'time', 'invoice', 'receipt', 'order',
                     'cash', 'visa', 'mastercard', 'card', 'change', 'due', 'paid']
    discount_keywords = ['discount', 'offer', 'off', 'savings']

    discount = 0.0

    for line in lines:
        line_lower = line.lower().strip()
        if not line_lower:
            continue

        prices = price_pattern.findall(line)
        if not prices:
            continue

        # Get the last matching price pattern in the line
        price_str = prices[-1]
        
        # Normalize the string to be parsed as float
        # If the separator before the last two digits is a comma, convert it to a dot
        if len(price_str) >= 3 and price_str[-3] == ',':
            price_str = price_str[:-3] + '.' + price_str[-2:]
            
        # Remove any remaining commas (which are thousand separators)
        price_str = price_str.replace(',', '')

        try:
            price = float(price_str)
        except ValueError:
            continue

        # Check tax lines
        if any(kw in line_lower for kw in tax_keywords):
            if 'cgst' in line_lower:
                cgst += price
            elif 'sgst' in line_lower:
                sgst += price
            else:
                # Generic GST — split equally
                cgst += price / 2
                sgst += price / 2
            continue

        # Check service charge
        if any(kw in line_lower for kw in service_keywords):
            service_charge += price
            continue

        # Check discount
        if any(kw in line_lower for kw in discount_keywords):
            discount += price
            continue

        # Check total lines
        if 'subtotal' in line_lower or 'sub total' in line_lower:
            subtotal = price
            continue

        if line_lower.startswith('total') or line_lower.endswith('total'):
            total = price
            continue

        # Skip non-item lines
        if any(kw in line_lower for kw in skip_keywords):
            continue

        # Everything else is a bill item
        # Extract item name — remove the price and trailing whitespace
        name = re.sub(r'\s*\d+(?:[.,]\d{3})*[.,]\d{2}\s*$', '', line).strip()
        name = re.sub(r'^\d+[\sx*]+', '', name).strip()  # remove leading numbers/quantities like "1 x "

        # Basic validation to ensure we're not adding noise
        if len(name) > 2 and price > 0 and price < 10000:
            items.append({
                "name": name if name else "Item",
                "price": price,
                "quantity": 1
            })

    return {
        "items": items,
        "tax": {
            "cgst": round(cgst, 2),
            "sgst": round(sgst, 2),
            "service_charge": round(service_charge, 2)
        },
        "discount": round(discount, 2),
        "subtotal": round(subtotal, 2),
        "total": round(total, 2)
    }