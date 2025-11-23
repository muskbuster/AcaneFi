# SSH Connection Troubleshooting for EC2

## Issue: Permission denied (publickey)

### Step 1: Fix Key File Permissions

```bash
# Navigate to Downloads folder
cd ~/Downloads

# Set correct permissions (read-only for owner)
chmod 400 tachyon-solver.pem

# Verify permissions
ls -la tachyon-solver.pem
# Should show: -r-------- (400)
```

### Step 2: Try Different Usernames

AWS uses different default usernames based on AMI:

```bash
# For Ubuntu
ssh -i tachyon-solver.pem ubuntu@13.234.67.38

# For Amazon Linux 2
ssh -i tachyon-solver.pem ec2-user@13.234.67.38

# For Debian
ssh -i tachyon-solver.pem admin@13.234.67.38

# For CentOS/RHEL
ssh -i tachyon-solver.pem centos@13.234.67.38
```

### Step 3: Verify Key File Format

```bash
# Check if it's a valid SSH key
head -1 tachyon-solver.pem
# Should show: -----BEGIN RSA PRIVATE KEY----- or -----BEGIN OPENSSH PRIVATE KEY-----

# Check key type
file tachyon-solver.pem
```

### Step 4: Check Security Group

**In AWS Console:**
1. EC2 → Instances → Select your instance
2. Security tab → Click Security Group
3. Inbound Rules → Verify SSH (port 22) is allowed from your IP

### Step 5: Verify Key Pair Association

**In AWS Console:**
1. EC2 → Instances → Select your instance
2. Details tab → Check "Key pair name"
3. Ensure it matches the key file you're using

### Step 6: Try Verbose SSH for Debugging

```bash
# Use verbose mode to see what's happening
ssh -v -i tachyon-solver.pem ubuntu@13.234.67.38

# Or even more verbose
ssh -vvv -i tachyon-solver.pem ubuntu@13.234.67.38
```

### Step 7: Alternative Connection Methods

#### Option A: Use EC2 Instance Connect (Browser-based)

1. EC2 Console → Instances → Select instance
2. Click "Connect" button
3. Choose "EC2 Instance Connect" tab
4. Click "Connect" (opens browser-based terminal)

#### Option B: Use Session Manager (if SSM is configured)

1. EC2 Console → Instances → Select instance
2. Click "Connect" button
3. Choose "Session Manager" tab
4. Click "Connect"

### Step 8: Convert Key Format (if needed)

If you have a `.pem` file but it's not working:

```bash
# Convert to OpenSSH format
ssh-keygen -p -m PEM -f tachyon-solver.pem

# Or convert from PPK (if using PuTTY)
puttygen tachyon-solver.ppk -O private-openssh -o tachyon-solver.pem
```

### Step 9: Check Instance Status

**In AWS Console:**
1. EC2 → Instances
2. Check "Instance state" - should be "Running"
3. Check "Status checks" - should be "2/2 checks passed"

### Step 10: Create New Key Pair (Last Resort)

If nothing works, create a new key pair:

1. EC2 → Key Pairs → Create Key Pair
2. Name: `arcanefi-backend-key`
3. Format: `.pem` (for Linux/Mac) or `.ppk` (for Windows)
4. Download and save securely
5. **Important**: Stop the instance → Change instance type → Change key pair → Start instance

**Note**: Changing key pair requires stopping the instance first.

---

## Quick Fix Commands

```bash
# 1. Fix permissions
chmod 400 ~/Downloads/tachyon-solver.pem

# 2. Try Ubuntu username
ssh -i ~/Downloads/tachyon-solver.pem ubuntu@13.234.67.38

# 3. If that fails, try ec2-user
ssh -i ~/Downloads/tachyon-solver.pem ec2-user@13.234.67.38

# 4. With verbose output
ssh -v -i ~/Downloads/tachyon-solver.pem ubuntu@13.234.67.38
```

---

## Common Solutions

### Solution 1: Wrong Permissions
```bash
chmod 400 tachyon-solver.pem
```

### Solution 2: Wrong Username
Try `ec2-user` instead of `ubuntu` (or vice versa)

### Solution 3: Security Group Blocking
Add your IP to Security Group inbound rules for SSH (port 22)

### Solution 4: Key Not Associated
Verify the key pair name in instance details matches your `.pem` file

---

## Still Not Working?

1. **Use EC2 Instance Connect** (browser-based, no key needed)
2. **Check AWS Systems Manager Session Manager** (if configured)
3. **Create new key pair** and associate it with the instance (requires stopping instance)

