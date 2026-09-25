import paramiko
import tarfile
import os

print("Archiving apps/web/dist...")
tar_path = "scratch/web_dist.tar.gz"
with tarfile.open(tar_path, "w:gz") as tar:
    tar.add("apps/web/dist", arcname=".")

print("Connecting to 31.76.85.134...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("31.76.85.134", username="root", password="VoPyNgdLHuJ6", timeout=15)

sftp = ssh.open_sftp()
print("Uploading web_dist.tar.gz...")
sftp.put(tar_path, "/tmp/web_dist.tar.gz")
sftp.close()

cmds = [
    "mkdir -p /tmp/web_dist",
    "tar -xzf /tmp/web_dist.tar.gz -C /tmp/web_dist",
    "docker cp /tmp/web_dist/. cargona_web:/usr/share/nginx/html/",
    "docker restart cargona_web",
    "rm -rf /tmp/web_dist /tmp/web_dist.tar.gz",
    "echo 'DEPLOY_SUCCESS'"
]

cmd_str = " && ".join(cmds)
print(f"Executing: {cmd_str}")
stdin, stdout, stderr = ssh.exec_command(cmd_str)
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())

ssh.close()
print("Done!")
