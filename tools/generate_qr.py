#!/usr/bin/env python3
"""Owner-operated QR generator; requires `pip install qrcode[pil] reportlab`.
Usage: python tools/generate_qr.py https://your-bakery.pages.dev
Generates high-resolution PNG and printable PDF in the current directory.
No network access, customer data, or external QR generation API is required.
"""
import sys
from urllib.parse import urlparse

if len(sys.argv) != 2 or urlparse(sys.argv[1]).scheme != 'https' or not urlparse(sys.argv[1]).netloc:
    raise SystemExit('Usage: python tools/generate_qr.py https://YOUR-BAKERY-WEBSITE-URL')
try:
    import qrcode
    from reportlab.pdfgen import canvas
except ImportError as exc:
    raise SystemExit('Install required packages with: pip install qrcode[pil] reportlab') from exc
url = sys.argv[1]
qr = qrcode.QRCode(version=None, error_correction=qrcode.constants.ERROR_CORRECT_H, box_size=16, border=4)
qr.add_data(url)
qr.make(fit=True)
img = qr.make_image(fill_color='#35281c', back_color='#ffffff').convert('RGB')
img.save('Mamma_Bees_Bakery_QR.png')
pdf = canvas.Canvas('Mamma_Bees_Bakery_QR.pdf', pagesize=(612, 792))
pdf.setTitle("Mamma Bee's Bakery — Website QR Code")
pdf.setFont('Helvetica-Bold', 24)
pdf.drawCentredString(306, 690, "Mamma Bee's Bakery")
pdf.setFont('Helvetica', 12)
pdf.drawCentredString(306, 662, 'Homemade in Nixa, Missouri')
pdf.drawImage('Mamma_Bees_Bakery_QR.png', 156, 273, 300, 300)
pdf.drawCentredString(306, 249, url[:90])
pdf.save()
print('Created Mamma_Bees_Bakery_QR.png and Mamma_Bees_Bakery_QR.pdf')
