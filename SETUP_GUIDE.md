# SETUP GUIDE: Siilksuite DEX Trading Client

This guide covers installation and setup for different operating systems and platforms.

## Table of Contents

- [Windows (PowerShell)](#windows-powershell)
- [Windows (WSL 2)](#windows-wsl-2)
- [Linux (Ubuntu/Debian)](#linux-ubuntudebian)
- [macOS](#macos)
- [Android (Termius SSH)](#android-termius-ssh)

---

## Windows (PowerShell)

### Prerequisites

- **Windows 10 or later**
- **Node.js v14+** — [Download](https://nodejs.org/en/download/)
- **Git for Windows** (optional) — [Download](https://git-scm.com/download/win)
- **PowerShell 5.0+** (built-in on Windows 10+)

### Installation Steps

1. **Download and Install Node.js**
   - Visit [nodejs.org](https://nodejs.org)
   - Download the LTS version
   - Run the installer with default settings
   - Verify installation:
     ```powershell
     node --version
     npm --version
     ```

2. **Clone the Repository**
   ```powershell
   git clone https://github.com/timedbase/Siilksuite-HTS.git
   cd Siilksuite-HTS
   ```

   Or download the ZIP file from GitHub and extract it.

3. **Install Dependencies**
   ```powershell
   npm install
   ```

4. **Run the Trading Client**

   **Option A: Using Node directly (recommended for Windows)**
   ```powershell
   node src/trade.js --network mainnet
   ```

   Then enter your credentials when prompted:
   - Account ID: `0.0.123456`
   - Private Key: (paste your private key, it won't display)

   **Option B: Using WSL (if installed)**
   ```powershell
   wsl ./trade.sh
   ```

### Troubleshooting on Windows

**Problem: Node.js command not found**
- Solution: Restart PowerShell or add Node.js to PATH manually

**Problem: "cannot be loaded because running scripts is disabled"**
- Solution: Open PowerShell as Administrator and run:
  ```powershell
  Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

**Problem: Git not recognized**
- Solution: Install Git for Windows from [git-scm.com](https://git-scm.com/download/win)

---

## Windows (WSL 2)

WSL 2 (Windows Subsystem for Linux 2) allows you to run Linux directly on Windows, which makes using the bash script easier.

### Prerequisites

- **Windows 10 Build 19041 or later** (check with `winver.exe`)
- **Administrator privileges**

### Installation Steps

1. **Install WSL 2**
   - Open PowerShell as Administrator
   ```powershell
   wsl --install
   wsl --set-default-version 2
   ```
   - Restart your computer when prompted

2. **Launch WSL Terminal**
   - Open PowerShell or Windows Terminal
   ```powershell
   wsl
   ```

3. **Update Package Manager**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

4. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

5. **Verify Installation**
   ```bash
   node --version
   npm --version
   ```

6. **Clone and Install**
   ```bash
   git clone https://github.com/timedbase/Siilksuite-HTS.git
   cd Siilksuite-HTS
   npm install
   ```

7. **Run the Trading Client**
   ```bash
   ./trade.sh
   ```

### Accessing Windows Files from WSL

Your Windows C:\ drive is mounted at `/mnt/c/` in WSL:

```bash
# Access your Windows Documents folder
cd /mnt/c/Users/YourUsername/Documents
```

---

## Linux (Ubuntu/Debian)

### Prerequisites

- **Ubuntu 20.04 LTS or later / Debian 11+**
- **sudo privileges** (for installing system packages)

### Installation Steps

1. **Update Package Manager**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js (LTS)**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   ```

3. **Verify Installation**
   ```bash
   node --version
   npm --version
   ```

4. **Install Git (if not installed)**
   ```bash
   sudo apt install -y git
   ```

5. **Clone the Repository**
   ```bash
   git clone https://github.com/timedbase/Siilksuite-HTS.git
   cd Siilksuite-HTS
   ```

6. **Install Dependencies**
   ```bash
   npm install
   ```

7. **Make the Script Executable** (if needed)
   ```bash
   chmod +x trade.sh
   ```

8. **Run the Trading Client**
   ```bash
   ./trade.sh
   ```

### Linux Systemd Service (Optional)

To run the trading client as a background service:

1. **Create a service file**
   ```bash
   sudo nano /etc/systemd/system/silksuite-trader.service
   ```

2. **Add the following content**
   ```ini
   [Unit]
   Description=Silksuite DEX Trading Client
   After=network.target

   [Service]
   Type=simple
   User=your_username
   WorkingDirectory=/home/your_username/Siilksuite-HTS
   ExecStart=/usr/bin/node /home/your_username/Siilksuite-HTS/src/trade.js --network mainnet
   Restart=on-failure
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

3. **Enable and start the service**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable silksuite-trader
   sudo systemctl start silksuite-trader
   ```

4. **Check service status**
   ```bash
   sudo systemctl status silksuite-trader
   ```

---

## macOS

### Prerequisites

- **macOS 10.15 (Catalina) or later**
- **Homebrew** (package manager) — [Install here](https://brew.sh)

### Installation Steps

1. **Install Homebrew** (if not installed)
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

2. **Install Node.js**
   ```bash
   brew install node
   ```

3. **Verify Installation**
   ```bash
   node --version
   npm --version
   ```

4. **Install Git** (usually pre-installed)
   ```bash
   brew install git
   ```

5. **Clone the Repository**
   ```bash
   git clone https://github.com/timedbase/Siilksuite-HTS.git
   cd Siilksuite-HTS
   ```

6. **Install Dependencies**
   ```bash
   npm install
   ```

7. **Make the Script Executable**
   ```bash
   chmod +x trade.sh
   ```

8. **Run the Trading Client**
   ```bash
   ./trade.sh
   ```

### Using Zsh Terminal (Default on macOS Catalina+)

The trading client works seamlessly with Zsh, which is the default shell on modern macOS systems.

---

## Android (Termius SSH)

Termius is a popular SSH client that allows you to connect to remote servers and run terminal commands from your Android device.

### Prerequisites

- **Android 5.0 (API 21) or later**
- **Termius App** — [Download from Google Play Store](https://play.google.com/store/apps/details?id=com.server.auditor.ssh.client)
- **Remote server** (AWS, DigitalOcean, Linode, or your own VPS)
- **SSH access** to your server

### Setup on Remote Server

1. **Install Node.js on your server** (see Linux guide above)
2. **Clone the repository**
   ```bash
   git clone https://github.com/timedbase/Siilksuite-HTS.git
   cd Siilksuite-HTS
   npm install
   ```

### Setup Termius on Android

1. **Install and Open Termius**
   - Open Google Play Store
   - Search for "Termius"
   - Download and install

2. **Import or Create SSH Key**
   - Open Termius
   - Go to Settings → SSH Keys
   - Either:
     - **Create New Key**: Tap "+" → Generate new key
     - **Import Key**: Paste your existing private key

3. **Add New Host**
   - In Termius, tap "Hosts" at the bottom
   - Tap "+" to add a new host
   - Enter:
     - **Label**: e.g., "Silksuite Trader"
     - **Hostname**: Your server IP or domain
     - **Port**: 22
     - **Username**: Your SSH username (e.g., ubuntu, ec2-user)
     - **Auth**: SSH Key → Select the key you created/imported

4. **Save and Connect**
   - Tap "Save"
   - Tap the host to connect

### Running the Trading Client on Termius

Once connected via SSH:

```bash
cd Siilksuite-HTS
./trade.sh
```

Or use the direct Node.js command:

```bash
node src/trade.js --network mainnet
```

### Tips for Mobile Trading

- **Use a persistent multiplexer** (tmux/screen) to keep the process running:
  ```bash
  tmux new-session -d -s trader './trade.sh'
  tmux attach -t trader
  ```

- **Use Termius plugins**:
  - Download the "Snippets" plugin for quick commands
  - Create shortcuts for common trading commands

- **Monitor logs**:
  ```bash
  tail -f .sniper-cache/sniper-state.json
  ```

- **Run in background** (without blocking):
  ```bash
  nohup ./trade.sh > trading.log 2>&1 &
  ```

### Recommended Cloud Providers for Mobile SSH

1. **DigitalOcean Droplet** ($4-6/month)
   - Simple setup
   - Good for beginners
   - Link: https://www.digitalocean.com

2. **Linode** ($5/month)
   - Reliable and fast
   - Good documentation
   - Link: https://www.linode.com

3. **AWS EC2 Free Tier** (Free for 12 months)
   - Scalable
   - More complex setup
   - Link: https://aws.amazon.com/ec2/

---

## Verification Steps

After installation, verify everything works:

```bash
# Test Node.js
node --version

# Test npm
npm --version

# Test npm packages
npm list

# Run diagnostics
npm run test-nodes

# Run the trading client
./trade.sh
```

Expected output:
```
✅ Credentials validated
📍 Account ID: 0.0.123456
📍 Public Key (derived): 302e...
💰 HBAR Balance: 10.50000000 HBAR
```

---

## Getting Help

If you encounter issues:

1. **Check Prerequisites** — Ensure Node.js v14+ is installed
2. **Update Dependencies** — Run `npm install` again
3. **Check Network** — Verify internet connectivity
4. **Test Nodes** — Run `npm run test-nodes` to check Smart Node availability
5. **Open an Issue** — Go to https://github.com/timedbase/Siilksuite-HTS/issues

---

**Last Updated**: February 2026
