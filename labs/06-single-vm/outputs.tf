output "public_ip" {
  description = "ใส่ในเบราว์เซอร์ http://<ip> (ถ้ามี domain ใช้ https://<domain>)"
  value       = aws_eip.web.public_ip
}

output "ssh" {
  value = "ssh ubuntu@${aws_eip.web.public_ip}"
}
