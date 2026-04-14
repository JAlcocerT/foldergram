# Foldergram for Static Galleries: Hugo to Foldergram Migration Guide

A practical guide to migrating from a static Hugo gallery to Foldergram for single-user, content-creator-focused photo sharing.

---

## TL;DR: Should You Switch?

| Aspect | Hugo Static | Foldergram | Winner |
|--------|-------------|-----------|--------|
| **UX/Design** | Basic, barebones | Instagram-style, modern | ✅ Foldergram |
| **Setup** | ~30 minutes | ~5 minutes (Docker) | ✅ Foldergram |
| **Hosting cost** | Free (GitHub Pages, Netlify) | ~$3-5/mo VPS | ⚠️ Hugo |
| **Adding photos** | Git commit + build | Drag-drop to folder or SFTP | ✅ Foldergram |
| **Triggers rebuilds** | Manual `hugo` or push | Auto on startup, watch, or webhook | ✅ Foldergram |
| **Customization** | Deep (Hugo templates) | Limited (Vue UI fixed) | ✅ Hugo |
| **Mobile-friendly** | Depends on theme | Perfect (PWA) | ✅ Foldergram |
| **Offline capable** | No | Yes (service worker) | ✅ Foldergram |

**Verdict:** For a mom who just wants to showcase knitting projects with great UX and minimal friction, **Foldergram wins**. The $3-5/month server cost is worth it for the better experience.

---

## Why Foldergram > Hugo for Your Knitting's Use Case

### **Hugo Pain Points You're Solving:**

1. **Complex Workflow**
   ```
   Hugo: Add photo → edit markdown → git commit → git push → wait for build
   Foldergram: Drag photo to folder → click "Scan" (or auto-scan)
   ```

2. **Technical Barrier**
   - Hugo requires markdown frontmatter knowledge
   - Requires git/terminal familiarity
   - Requires understanding build process
   - Foldergram: Just add files to folder

3. **UI/UX**
   - Hugo: Generic blog-style layout
   - Foldergram: Beautiful Instagram-like feed, profile pages, collections

4. **Mobile Experience**
   - Hugo: Responsive web, but not PWA
   - Foldergram: Full PWA, works offline, installable on phone

5. **Browsing Experience**
   - Hugo: Manual navigation, no feed discovery
   - Foldergram: Home feed, Explore, Moments/Highlights, deep likes

### **What Your Knitting Gets:**

✅ **Better UX**
- Feed scrolling instead of pagination
- Folder profiles like Instagram accounts
- Beautiful thumbnails and previews
- Organized by folder (project/collection)

✅ **Easier Photo Management**
- Add to folder → automatic indexing
- No markdown editing
- No git knowledge needed
- View instantly via PWA

✅ **Engagement Features (if she wants them)**
- She can like photos herself (local favorites)
- Visitors see beautiful presentations
- Export-friendly (can screenshot or share links)

❌ **Trade-offs:**
- Requires a small server (not free)
- Less customizable than Hugo
- No theme selection

---

## Architecture: Running Foldergram for Single-User Hosting

### **Option 1: Simple VPS Hosting (Recommended)**

**Setup:**
```
1. Rent small VPS: $3-5/month (DigitalOcean, Linode, Vultr, Hetzner)
2. Install Docker
3. Deploy Foldergram via docker-compose
4. Add Knitting's knitting photos to /data/gallery/
5. Set up optional password if needed (she can bypass with local access)
6. Done!
```

**Pros:**
- ✅ Cheapest production option
- ✅ Full control
- ✅ Can add photos via SFTP/rsync
- ✅ Can trigger scans via webhook or cron

**Cons:**
- ❌ Tiny monthly cost ($3-5)
- ❌ Need to manage server (security updates, backups)
- ❌ Requires minimal DevOps knowledge

**Specs for VPS:**
```
CPU: 1 core (fine)
RAM: 512MB-1GB (fine)
Storage: Depends on photos (100GB to 1TB)
  - For knitting projects: probably 50-100GB enough

Cost breakdown:
- Compute: $3-5/mo
- Storage: Often included, or $5-20/mo for extra
- Domain: ~$1/year with Freenom or $10/year with Namecheap
- Total: ~$5-8/month
```

### **Option 2: Home Server / Raspberry Pi**

**Setup:**
```
1. Deploy Foldergram on home server/Raspberry Pi
2. Expose via reverse proxy (nginx + Let's Encrypt)
3. Optional: Use CloudFlare Tunnel for HTTPS without port forwarding
4. Add photos locally via filesystem
5. Auto-triggers watcher in dev, or manual scan in production
```

**Pros:**
- ✅ Zero hosting cost
- ✅ Full local control
- ✅ Can add photos via Samba/NFS share
- ✅ Instant indexing with dev watcher

**Cons:**
- ❌ Internet uptime depends on home connection
- ❌ Need dynamic DNS or tunnel setup
- ❌ Energy cost (~$5-10/month to run 24/7)
- ❌ More complex networking

**Good for:** Families who want private galleries, low visibility

### **Option 3: Container Platform (Next-Easiest)**

**Platforms:**
- **Railway.app** - $5/month starter
- **Render.com** - $7/month PostgreSQL optional
- **Fly.io** - Pay per usage (~$3-5/month)

**Pros:**
- ✅ One-click deployments
- ✅ Automatic HTTPS
- ✅ Managed backups
- ✅ Great for side projects

**Cons:**
- ❌ Less control than VPS
- ❌ Limited storage (may need $$ for volumes)
- ❌ Slightly more expensive than raw VPS

---

## Handling Photo Uploads: Multiple Approaches

### **Approach 1: SFTP/Rsync Upload (My Recommendation)**

**How it works:**

```
Your Knitting:
1. Opens SFTP client (Transmit, WinSCP, Filezilla)
2. Connects to server: sftp://knitting.example.com
3. Drags photos to /data/gallery/new-project/
4. Photos appear in ~30 seconds (auto-watcher on VPS, or manual scan)
```

**Setup (one-time):**

```bash
# On server:
mkdir -p /data/gallery/new-project
chmod 755 /data/gallery
chown -R foldergram:foldergram /data/gallery

# Enable SFTP in sshd_config
# Add to /etc/ssh/sshd_config:
Subsystem sftp /usr/lib/openssh/sftp-server
AllowUsers Knitting@*

# Restart SSH
systemctl restart ssh
```

**Your Knitting uses:**
- WinSCP (Windows) - free, drag-and-drop GUI
- Transmit (Mac) - paid, very polished
- Nautilus/Files (Linux) - built-in

**Trigger scan:**
```bash
# Option A: Manual click in Foldergram UI
- Settings → Manual Scan → Click button

# Option B: Cron job on server
# Every 5 minutes
*/5 * * * * cd /app && npm run rescan > /var/log/foldergram-rescan.log 2>&1

# Option C: Webhook (more later)
```

**Pros:**
- ✅ Familiar to anyone who's used Dropbox sync
- ✅ Selective upload (only new files)
- ✅ Can organize into folders on the fly
- ✅ Works from phone (iOS Files app, Android)
- ✅ No git/CI needed

**Cons:**
- ❌ Requires SFTP client on Knitting's computer
- ❌ Manual scan click needed (or cron job)

---

### **Approach 2: CI/CD Webhook Trigger (GitHub Actions)**

**Use case:** If Knitting commits new photos to a GitHub repo

**Setup:**
```
1. Create GitHub repo: Knitting/knitting-gallery
2. Knitting adds photos via:
   - GitHub web UI (click upload)
   - Desktop app (drag photos to folder)
   - Desktop client syncing
3. GitHub Actions webhook triggers Foldergram rescan on server
```

**GitHub Actions Workflow:**
```yaml
# .github/workflows/scan-gallery.yml
name: Scan Gallery

on:
  push:
    paths:
      - 'gallery/**'

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Trigger Foldergram scan
        run: |
          curl -X POST http://knitting.example.com:4140/api/admin/rescan \
            -H "Authorization: Bearer ${{ secrets.SCAN_TOKEN }}" \
            -H "Content-Type: application/json"
```

**Server side (webhook handler):**
```bash
# Simple bash script to validate token + run scan
# Place in: /opt/foldergram/webhook-scan.sh

#!/bin/bash
TOKEN="$1"
EXPECTED="YOUR_SECRET_TOKEN_HERE"

if [ "$TOKEN" != "$EXPECTED" ]; then
  exit 1
fi

cd /app && npm run rescan
```

**Pros:**
- ✅ Fully automated (push → scan)
- ✅ Version control for photos
- ✅ Works from phone (GitHub mobile app)
- ✅ No SFTP client needed
- ✅ Creates commit history

**Cons:**
- ❌ GitHub private repo has size limits (1GB soft, 100GB per repo hard)
- ❌ Requires understanding Git workflow
- ❌ Slower than direct SFTP (need commit time)
- ❌ Requires webhook authentication setup

**Good for:** Knitting who uses GitHub already, or you managing the repo for her

---

### **Approach 3: Simple Web Upload Form (DIY)**

**Build a minimal upload handler:**
```typescript
// server/src/routes/upload.ts
router.post('/api/admin/upload', (req, res) => {
  // Accept multipart form data
  // Save to GALLERY_ROOT
  // Trigger rescan
});
```

**Frontend:**
```html
<form action="/api/admin/upload" method="post" enctype="multipart/form-data">
  <input type="file" multiple accept="image/*,video/*">
  <input type="text" placeholder="Folder name (project name)">
  <button>Upload & Scan</button>
</form>
```

**Pros:**
- ✅ No external tools needed
- ✅ Works on phone
- ✅ Fast and simple

**Cons:**
- ❌ Requires coding (small amount)
- ❌ No version control
- ❌ Knitting's browser must be open
- ❌ Large files timeout risk
- ❌ File size limits (usually 100MB-1GB per upload)

**Good for:** Tech-savvy creators comfortable with web interfaces

---

### **Approach 4: Shared Network Drive (Home Server)**

**If running on home server:**
```
Setup:
1. Share /data/gallery/ via Samba (Windows) or NFS (Mac)
2. Knitting connects via network drive letter (\\server\gallery)
3. Drag photos into subfolders
4. Watcher auto-triggers rescan

Windows:
  - \\server\gallery shows as a drive letter
  - Drag files like Google Drive
  - Photos appear in ~5 seconds

Mac:
  - Mount via Finder → Go → Connect to Server
  - Drag files like Dropbox
```

**Pros:**
- ✅ Instant (watcher in dev mode)
- ✅ Feels like local folder
- ✅ Zero latency
- ✅ No network delays

**Cons:**
- ❌ Requires local network setup
- ❌ Only works when home server is running
- ❌ Internet fails = can't access from outside
- ❌ More complex networking

**Good for:** Home-only galleries, families on same network

---

## Recommended Setup for Your Knitting

**Tier 1: If she's tech-comfortable with you helping**

```
Deploy:
1. Spin up $5/month DigitalOcean Droplet
2. Install Docker
3. Deploy Foldergram via docker-compose
4. Point domain: knitting.example.com
5. Set up reverse proxy (nginx) for HTTPS

Photo workflow:
1. Knitting uses WinSCP to SFTP into server
2. Drags photos to /data/gallery/new-project/
3. Waits 30 seconds for auto-scan
4. Views via browser at knitting.example.com

Maintenance:
- You: Manage server updates (15 min/month)
- You: Monitor disk space (check quarterly)
- Knitting: Just use it!

Cost: $5/mo VPS + $1/year domain = $61/year
```

**Tier 2: If she wants minimal friction**

```
Deploy:
1. Set up Foldergram on home Raspberry Pi
2. Use CloudFlare Tunnel for HTTPS (no port forwarding)
3. Access via https://knitting.cloudflare.com

Photo workflow:
1. Knitting maps server as network drive (Windows/Mac)
2. Drags photos to \\raspberrypi\gallery\new-project\
3. Photos appear in ~5 seconds (watcher)
4. Views via browser

Cost: $0 (home network + free Cloudflare)
```

**Tier 3: If you want zero server maintenance**

```
Deploy:
1. Push to GitHub: Knitting/knitting-gallery repo
2. Deploy via Fly.io or Railway
3. Set up GitHub Actions webhook

Photo workflow:
1. Knitting uses GitHub mobile/web UI to upload
2. Commits trigger auto-scan
3. Views via browser

Cost: $3-5/mo platform + $0 GitHub
```

---

## Migration from Hugo

### **Step 1: Export Existing Content**

```bash
# Hugo stores posts in:
content/posts/                    # Markdown files
static/images/                    # Image files

# Extract photos:
find static/images/ -type f \( -name "*.jpg" -o -name "*.png" -o -name "*.webp" \) \
  -exec cp {} /tmp/hugo-export/ \;

# Create folders per project:
# Hugo post "2024-01-15-winter-sweater" becomes:
/data/gallery/winter-sweater/IMG_*.jpg
```

### **Step 2: Organize for Foldergram**

```
Hugo structure (post-centric):
content/posts/
├── 2024-01-15-winter-sweater.md
└── 2024-02-20-spring-shawl.md

Foldergram structure (folder-centric):
data/gallery/
├── winter-sweater/
│   ├── IMG_001.jpg
│   ├── IMG_002.jpg
│   └── IMG_003.jpg
└── spring-shawl/
    ├── IMG_010.jpg
    └── IMG_011.jpg
```

### **Step 3: Migrate Metadata (Optional)**

**If you want post descriptions:**

Option A: Add to Foldergram settings (manual, one-time)
Option B: Keep Hugo running as a reference
Option C: Store descriptions as `.md` files in each folder (custom solution)

Example custom extension:
```
data/gallery/winter-sweater/
├── IMG_001.jpg
├── IMG_002.jpg
├── README.md          # Description, project notes
```

**Step 4: Test & Validate**

```bash
1. Deploy Foldergram to test server
2. Upload Hugo photos to /data/gallery/
3. Run scan: npm run rescan
4. Verify photos appear correctly
5. Test on mobile via PWA
```

**Step 5: DNS Cutover**

```bash
Old site: knitting.github.io (Hugo, static)
New site: knitting.example.com (Foldergram, VPS)

Option A: Direct cutover
1. Update DNS CNAME to point to Foldergram server
2. Redirect old Hugo site to new domain

Option B: Parallel run
1. Keep Hugo site live temporarily
2. Add link from Hugo to Foldergram
3. Phase out Hugo after Knitting is comfortable
```

---

## Automation & CI/CD Examples

### **Example: Scheduled Rescan (Cron)**

```bash
# SSH to server and edit crontab:
crontab -e

# Add this line (rescans every 15 minutes):
*/15 * * * * cd /app && docker exec foldergram npm run rescan >> /var/log/rescan.log 2>&1
```

### **Example: Webhook on File Upload**

```python
# Simple Python webhook listener
# Place in: /opt/foldergram/webhook.py

from flask import Flask, request
import subprocess
import os

app = Flask(__name__)
SECRET = os.getenv('WEBHOOK_SECRET')

@app.route('/webhook/scan', methods=['POST'])
def scan():
    token = request.headers.get('X-Webhook-Token')

    if token != SECRET:
        return {'error': 'Unauthorized'}, 401

    # Run rescan
    result = subprocess.run(
        ['docker', 'exec', 'foldergram', 'npm', 'run', 'rescan'],
        capture_output=True
    )

    return {
        'status': 'scanned',
        'output': result.stdout.decode()
    }, 200

if __name__ == '__main__':
    app.run(port=5000)
```

Start with:
```bash
systemctl start webhook
systemctl enable webhook  # Auto-start on reboot
```

### **Example: GitHub Actions Auto-Sync**

```yaml
# .github/workflows/sync-to-foldergram.yml
name: Sync to Foldergram

on:
  push:
    branches: [main]

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Sync files to server
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa
          ssh-keyscan -H ${{ secrets.SERVER_IP }} >> ~/.ssh/known_hosts

          rsync -avz --delete gallery/ \
            Knitting@${{ secrets.SERVER_IP }}:/data/gallery/

      - name: Trigger rescan
        run: |
          curl -X POST \
            -H "X-Webhook-Token: ${{ secrets.WEBHOOK_TOKEN }}" \
            https://knitting.example.com/webhook/scan
```

Secrets to set in GitHub:
```
SSH_KEY            → Private key for server access
SERVER_IP          → VPS IP address
WEBHOOK_TOKEN      → Random token for webhook auth
```

---

## Cost Comparison: Hugo vs Foldergram

### **Hugo Static (Current)**

| Item | Cost | Notes |
|------|------|-------|
| Hosting | $0 | GitHub Pages / Netlify free tier |
| Domain | $1-10/year | Optional |
| CDN | $0 | Included in free hosting |
| Dev time | 2-3 hours | Setup + learn Hugo |
| Monthly ops | 0 hours | Fully automated |
| **Annual Total** | **$1-10** | |

### **Foldergram on Budget VPS**

| Item | Cost | Notes |
|------|------|-------|
| Hosting | $36-60/year | $3-5/month DigitalOcean |
| Domain | $1-10/year | Optional |
| Email | $0 | Not needed |
| Monthly ops | 0.5 hours | Security updates, disk checks |
| Dev time | 1-2 hours | Docker + docker-compose |
| **Annual Total** | **$37-70** | |

### **Foldergram on Home Server**

| Item | Cost | Notes |
|------|------|-------|
| Hardware | $50-150 | One-time, Raspberry Pi or old PC |
| Electricity | $60-120/year | 24/7 running cost |
| Networking | $0 | Home internet |
| Domain | $1-10/year | Optional (use Cloudflare Tunnel free) |
| Monthly ops | 1-2 hours | Updates, backups, monitoring |
| **Annual Total** | **$61-130 + hardware** | |

**Verdict:**
- **Cheapest:** Hugo (but worse UX)
- **Best value:** Foldergram on $5/mo VPS ($70/year vs infinite Hugo maintenance)
- **Best UX:** Foldergram on home server (zero hosting cost, requires hardware + electricity)

---

## Risk Assessment: What Could Go Wrong?

### **VPS Hosting Risks**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Server down | Low | High | Daily automated backups, monitoring |
| Disk full | Medium | Medium | Check disk monthly, alerts |
| Hacked | Low | High | Firewall, fail2ban, disable password auth |
| Photo loss | Low | Catastrophic | Weekly backup to GitHub or home drive |
| Forgotten renewal | Low | Medium | Set 30-day renewal reminder |

**Backup strategy:**
```bash
# Daily backup to GitHub
0 2 * * * rsync -avz /data/gallery/ /tmp/backup/
0 3 * * * cd /tmp/backup && git add . && git commit -m "daily backup" && git push

# Weekly backup to home server
0 4 * * 0 rsync -avz /data/gallery/ home-server:/backups/knitting/
```

### **Home Server Risks**

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Internet down | Medium | High | Cache via PWA, access fails while down |
| Power failure | Low | High | UPS battery backup ($50) |
| Hardware failure | Low | Catastrophic | RAID or backup drives |
| Loud/hot | Medium | Low | Modern Raspberry Pi quiet and cool |

---

## Phased Migration Plan

### **Phase 1: Proof of Concept (1 week)**

```
1. Deploy Foldergram to test VPS or home server
2. Import 20-30 photos from existing Hugo gallery
3. Knitting tests UI, navigation, viewing
4. Get feedback on UX vs Hugo
5. Decide: proceed or stay with Hugo?
```

### **Phase 2: Full Setup (1-2 weeks)**

```
1. Production server setup
2. Configure SFTP or GitHub Actions upload
3. Migrate all existing photos
4. Set up backups
5. DNS cutover
```

### **Phase 3: Training & Go Live (1 day)**

```
1. Show Knitting how to upload (SFTP or GitHub)
2. Show Knitting how to trigger scan
3. Provide emergency contact for issues
4. Announce new gallery to family
```

### **Phase 4: Maintenance (Ongoing)**

```
Monthly:
- Check disk space
- Review error logs
- Test backup restore

Quarterly:
- Security updates
- Dependency updates
- Photo organization review
```

---

## Foldergram-Specific Config for Knitting's Gallery

```bash
# .env configuration for knitting gallery
NODE_ENV=production
SERVER_PORT=4141

# Directories
DATA_ROOT=./data
GALLERY_ROOT=./data/gallery
DB_DIR=./data/db
THUMBNAILS_DIR=./data/thumbnails
PREVIEWS_DIR=./data/previews

# Performance (small gallery = defaults fine)
SCAN_DISCOVERY_CONCURRENCY=2
SCAN_DERIVATIVE_CONCURRENCY=2

# Optional: shared password (if making public)
# PUBLIC_DEMO_MODE=0  # default, allow mutations
# If password-protected:
# Sessions stored in SQLite, set via Settings UI

# Reverse proxy (if using nginx)
# CSRF_TRUSTED_ORIGINS=https://knitting.example.com
```

---

## Nginx Reverse Proxy Setup

```nginx
# /etc/nginx/sites-available/knitting
server {
    listen 80;
    server_name knitting.example.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name knitting.example.com;

    ssl_certificate /etc/letsencrypt/live/knitting.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/knitting.example.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Proxy to Foldergram
    location / {
        proxy_pass http://localhost:4141;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for long uploads
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
        proxy_read_timeout 300s;
    }
}
```

Enable:
```bash
ln -s /etc/nginx/sites-available/knitting /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
certbot certonly --standalone -d knitting.example.com  # HTTPS cert
```

---

## Conclusion: The Verdict for Your Knitting

### **Switch to Foldergram if:**
- ✅ She likes beautiful, modern UX
- ✅ She wants easier photo uploads (no git knowledge)
- ✅ She's happy with $5-10/month extra cost
- ✅ She wants mobile PWA experience
- ✅ You're willing to manage small server (or home Pi)

### **Stay with Hugo if:**
- ✅ She needs free hosting (GitHub Pages)
- ✅ She's comfortable with git workflows
- ✅ Deep customization matters (themes, layout)
- ✅ You want zero maintenance burden

---

## Next Steps

1. **Try it:** Deploy Foldergram locally or test VPS for 1 week
2. **Get feedback:** Show Knitting the UI, ask if she prefers to Hugo
3. **Plan deployment:** Choose VPS or home server based on her needs
4. **Set upload method:** SFTP, GitHub, or network drive
5. **Migrate:** Import existing knitting photos
6. **Go live:** Announce to family with new beautiful gallery

**Cost to try:** $5 for 1 month DigitalOcean trial (free $200 credit available)

Your Knitting's knitting deserves a beautiful gallery. Foldergram provides that. Worth the $5/month IMO.
