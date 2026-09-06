import smtplib
from email.message import EmailMessage

msg = EmailMessage()
msg.set_content('This is a test email sent from Python.')
msg['Subject'] = 'Test from Backend'
msg['From'] = 'info@MyDevice.in'
msg['To'] = 'najrudinan100@gmail.com'

try:
    print("Connecting to smtp.gmail.com:587...")
    server = smtplib.SMTP('smtp.gmail.com', 587, timeout=5)
    server.starttls()
    print("Logging in...")
    server.login('devdeviceaccess@gmail.com', 'bbcfrhmoodogoirq')
    print("Sending email...")
    server.send_message(msg)
    server.quit()
    print("Email sent successfully!")
except Exception as e:
    print("Failed to send email:", e)
