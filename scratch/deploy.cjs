const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const conn = new Client();

conn.on('ready', () => {
  console.log('SSH Client :: ready');

  // Command to update git and copy new built dist or pull and rebuild
  const command = `
    cd /opt/cargona &&
    git pull origin main &&
    echo "Updating cargona_web dist..." &&
    if [ -d "apps/web/dist" ]; then
      docker cp apps/web/dist/. cargona_web:/usr/share/nginx/html/ || true
    fi &&
    echo "Done updating container!"
  `;

  // We can also upload our local built apps/web/dist to the server SFTP
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('SFTP error:', err);
      execRemote();
      return;
    }

    console.log('Uploading dist files via SFTP...');
    const localDist = path.join(__dirname, '..', 'apps', 'web', 'dist');
    
    // Create a tar or upload recursively
    const { execSync } = require('child_process');
    try {
      execSync(`tar -czf "${path.join(__dirname, 'web_dist.tar.gz')}" -C "${localDist}" .`);
      console.log('Created web_dist.tar.gz');
      
      sftp.fastPut(path.join(__dirname, 'web_dist.tar.gz'), '/tmp/web_dist.tar.gz', (uploadErr) => {
        if (uploadErr) {
          console.error('Upload error:', uploadErr);
          conn.end();
          return;
        }
        console.log('Uploaded web_dist.tar.gz to /tmp/');
        
        const deployCmd = `
          mkdir -p /tmp/web_dist &&
          tar -xzf /tmp/web_dist.tar.gz -C /tmp/web_dist &&
          docker cp /tmp/web_dist/. cargona_web:/usr/share/nginx/html/ &&
          docker restart cargona_web &&
          rm -rf /tmp/web_dist /tmp/web_dist.tar.gz &&
          echo "DEPLOY_COMPLETE"
        `;
        
        conn.exec(deployCmd, (execErr, stream) => {
          if (execErr) throw execErr;
          stream.on('close', (code, signal) => {
            console.log('Stream :: close :: code: ' + code);
            conn.end();
          }).on('data', (data) => {
            console.log('STDOUT: ' + data);
          }).stderr.on('data', (data) => {
            console.log('STDERR: ' + data);
          });
        });
      });
    } catch (e) {
      console.error('Error creating tar:', e);
      conn.end();
    }
  });
}).connect({
  host: '31.76.85.134',
  port: 22,
  username: 'root',
  password: 'VoPyNgdLHuJ6'
});
