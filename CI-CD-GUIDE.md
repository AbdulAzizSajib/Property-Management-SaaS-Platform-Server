# CI/CD Guide — GitHub Actions → cPanel (Namecheap)

এই গাইডটা এই backend-এর **স্বয়ংক্রিয় deploy (CI/CD)** কীভাবে কাজ করে, কীভাবে ব্যবহার করবেন,
আর শূন্য থেকে আবার সেটআপ করতে হলে কী করবেন — সব ধাপে ধাপে বর্ণনা করে (command সহ)।

> এক লাইনে: **`git push origin main` করলেই অটো deploy হয়।** আর কখনো cPanel-এ manually file
> upload করতে হবে না।

---

## ০. দৈনন্দিন ব্যবহার (সবচেয়ে দরকারি অংশ)

কোড পরিবর্তনের পর deploy করতে শুধু এটুকুই:

```bash
git add .
git commit -m "your message"
git push origin main
```

push হওয়ার সাথে সাথে GitHub Actions নিজে থেকে:
1. কোড build করে (`tsc` + `prisma generate`)
2. database migration apply করে (Neon)
3. server-এ ফাইল পাঠায় (rsync over SSH)
4. দরকার হলে `npm install` করে + app restart করে

**deploy status দেখার জায়গা:**
`https://github.com/AbdulAzizSajib/Property-Management-SaaS-Platform-Server/actions`

🟡 হলুদ = চলছে · 🟢 সবুজ = সফল · 🔴 লাল = fail (নিচের Troubleshooting দেখুন)

> GitHub UI থেকে কোনো নতুন push ছাড়াই deploy চালাতে চাইলে: Actions → "Deploy to cPanel"
> → **Run workflow** বাটন (এটা `workflow_dispatch` দিয়ে সম্ভব হয়েছে)।

---

## ১. পুরো প্রক্রিয়া এক নজরে

```
আপনি code push করেন (main branch)
        │
        ▼
GitHub Actions runner (Ubuntu) চালু হয়
        │
        ├─ 1. Checkout code
        ├─ 2. pnpm + Node 20 setup
        ├─ 3. pnpm install --frozen-lockfile
        ├─ 4. ENV_FILE secret → .env (runner-এ, server-এ যায় না)
        ├─ 5. pnpm build  → dist/ তৈরি (prisma generate + tsc + fix-imports)
        ├─ 6. prisma migrate deploy → Neon DB-তে migration apply
        ├─ 7. SSH key setup + rsync → dist/, package.json, .npmrc, prisma/, scripts/
        └─ 8. SSH → server-deploy.sh চালায় (npm install if needed + restart)
                │
                ▼
        cPanel app reload হয় (tmp/restart.txt touch)
```

**কেন build server-এ নয়, GitHub-এ?**
Namecheap shared host দুর্বল (CPU/RAM limit)। GitHub runner শক্তিশালী, তাই ভারী কাজ (TypeScript
compile, prisma generate) সেখানে হয়, আর শুধু তৈরি `dist/` server-এ পাঠানো হয়।

---

## ২. যে ফাইলগুলো এই setup চালায়

| ফাইল | কাজ |
|------|-----|
| `.github/workflows/deploy.yml` | মূল GitHub Actions pipeline — সব step এখানে |
| `scripts/server-deploy.sh` | server-এ চলে: package.json বদলালে npm install, তারপর restart |
| `.gitattributes` | `.sh` ফাইল সবসময় LF line-ending রাখে (নাহলে Linux-এ bash crash করে) |

---

## ৩. GitHub Secrets (গোপন তথ্য)

CI/CD-র সব sensitive তথ্য GitHub Secrets-এ encrypted থাকে — কোডে নয়।

**কোথায়:** GitHub repo → **Settings** → **Secrets and variables** → **Actions**

| Secret নাম | মান | ব্যাখ্যা |
|-----------|-----|---------|
| `SSH_HOST` | `69.57.162.27` | cPanel server-এর IP (Shared IP) |
| `SSH_PORT` | `21098` | Namecheap-এর SSH port (সাধারণত 22 নয়) |
| `SSH_USER` | `aciabcgv` | cPanel username |
| `APP_PATH` | `/home/aciabcgv/my-nodejs-pro` | server-এ app-এর full path |
| `SSH_PRIVATE_KEY` | (private key পুরোটা) | deploy SSH key-এর private অংশ |
| `ENV_FILE` | (পুরো `.env` content) | সব environment variable, একটা secret-এ |

> **`ENV_FILE` কেন?** আলাদা ২৮টা secret না দিয়ে পুরো `.env` একটাতে রাখা হয়েছে — সহজ ও maintain
> করা সুবিধাজনক। নতুন env variable যোগ হলে শুধু এই একটা secret update করলেই হয়।

> ⚠️ `.env` পরিবর্তন করলে (নতুন key/value) — local `.env` ঠিক করুন, **তারপর `ENV_FILE`
> secret-ও update করুন** (edit → পুরো content আবার paste)। নাহলে server পুরোনো env পাবে।

---

## ৪. দুটো গুরুত্বপূর্ণ নিয়ম (মনে রাখবেন)

### a) Lockfile সবসময় sync রাখুন
CI `pnpm install --frozen-lockfile` চালায় — `pnpm-lock.yaml` আর `package.json` হুবহু না
মিললে fail করে। তাই dependency যোগ/বাদ দিলে:

```bash
pnpm install            # lock আপডেট হয়
git add pnpm-lock.yaml package.json
git commit -m "deps: ..."
git push origin main
```

### b) `.env` ও `ENV_FILE` একসাথে আপডেট রাখুন
নতুন env variable যোগ করলে:
1. local `.env`-এ যোগ করুন
2. GitHub-এ `ENV_FILE` secret edit করে পুরো নতুন `.env` paste করুন
3. push করুন

---

## ৫. শূন্য থেকে আবার সেটআপ করতে হলে (নতুন server/repo)

> এটা শুধু তখন দরকার যদি নতুন কোথাও আবার পুরো জিনিস বসাতে হয়। স্বাভাবিক ব্যবহারে লাগবে না।

### ধাপ ১ — SSH key বানান (আপনার PC-তে)
```bash
ssh-keygen -t ed25519 -f ~/.ssh/namecheap_deploy -N "" -C "github-actions-deploy"
```
দুটো ফাইল হবে: `namecheap_deploy` (private) ও `namecheap_deploy.pub` (public)।

### ধাপ ২ — public key cPanel-এ authorize করুন
1. cPanel → **SSH Access** → **Manage SSH Keys** → **Import Key**
2. `namecheap_deploy.pub`-এর content paste করুন (private ঘর খালি রাখুন) → Import
3. key-এর পাশে **Manage** → **Authorize** ✅ (authorize না করলে কাজ করবে না)

### ধাপ ৩ — SSH connection টেস্ট করুন
```bash
ssh -i ~/.ssh/namecheap_deploy -p 21098 aciabcgv@69.57.162.27 "whoami && pwd"
```
আপনার username ও home path দেখালে SSH ঠিক আছে।

### ধাপ ৪ — server-এর তথ্য বের করুন
```bash
# app path ও node env path নিশ্চিত করুন
ssh -i ~/.ssh/namecheap_deploy -p 21098 aciabcgv@69.57.162.27 'bash -lc "
  ls ~/nodevenv;                       # node env folder-এর নাম
  ls ~/my-nodejs-pro;                  # app folder
  source ~/nodevenv/my-nodejs-pro/20/bin/activate && node -v && npm -v
"'
```

### ধাপ ৫ — GitHub Secrets যোগ করুন
উপরের **section ৩**-এর টেবিল অনুযায়ী ৬টা secret যোগ করুন।
- `SSH_PRIVATE_KEY`-এ `cat ~/.ssh/namecheap_deploy`-এর পুরো output (BEGIN…END সহ)।
- `ENV_FILE`-এ পুরো `.env` content।

### ধাপ ৬ — workflow ও script কোডে যোগ করুন
এই repo-তে `.github/workflows/deploy.yml`, `scripts/server-deploy.sh`, `.gitattributes`
আছে। নতুন repo হলে এগুলো copy করুন (path/port নিজের অনুযায়ী বদলান)।

### ধাপ ৭ — push করে test করুন
```bash
git push origin main
```
Actions ট্যাবে সব step সবুজ হলে সফল।

---

## ৬. কীভাবে যাচাই করবেন deploy সত্যিই হলো (server-এ)

```bash
ssh -i ~/.ssh/namecheap_deploy -p 21098 aciabcgv@69.57.162.27 'bash -lc "
  echo \"--- restart.txt (app reload time) ---\";    ls -la --time-style=full-iso ~/my-nodejs-pro/tmp/restart.txt;
  echo \"--- dist deploy time ---\";                 ls -la ~/my-nodejs-pro/dist/app/server.js;
  echo \"--- prisma client version (7.3.0?) ---\";   grep -m1 version ~/my-nodejs-pro/node_modules/@prisma/client/package.json;
  echo \"--- recent errors ---\";                    tail -20 ~/my-nodejs-pro/stderr.log;
"'
```

---

## ৭. server-deploy.sh কী করে

`scripts/server-deploy.sh` server-এ চলে (GitHub Actions SSH দিয়ে call করে)। এর যুক্তি:

1. cPanel Node 20 env activate করে (`set +u`/`set -u` দিয়ে — কারণ cPanel-এর activate script
   `CL_VIRTUAL_ENV` নামে unset variable ছোঁয়)।
2. `package.json`-এর sha256 hash গত deploy-এর সাথে মিলিয়ে দেখে:
   - **বদলেছে** → `package-lock.json` মুছে `npm install --omit=dev` (শুধু production deps)
   - **বদলায়নি** → install skip (দ্রুত deploy)
3. `tmp/restart.txt` touch করে → Passenger app reload করে।

> Build server-এ হয় না; prisma driver adapter ব্যবহার করায় server-এ `prisma generate`
> বা engine binary লাগে না।

---

## ৮. Troubleshooting (যেসব সমস্যা হয়েছিল ও সমাধান)

| সমস্যা (যে step-এ) | কারণ | সমাধান |
|--------------------|------|--------|
| `ERR_PNPM_OUTDATED_LOCKFILE` (Install) | `pnpm-lock.yaml` আর `package.json` মেলে না | local-এ `pnpm install` → `pnpm-lock.yaml` commit করে push |
| `NODE_ENV is required` / dotenv `(0)` (Build) | runner-এ `.env` নেই বা `ENV_FILE` secret খালি | `ENV_FILE` secret edit করে পুরো `.env` content paste |
| `CL_VIRTUAL_ENV: unbound variable` (remote deploy) | cPanel activate script + `set -u` | script-এ `set +u`/`set -u` দিয়ে activate wrap করা (already fixed) |
| `\r: command not found` (remote deploy) | `.sh` ফাইল CRLF line-ending | `.gitattributes`-এ `*.sh text eol=lf` (already fixed) |
| `ETIMEDOUT` Prisma query (server runtime, **CI-র নয়**) | Namecheap outbound **port 5432 ব্লক** করে — server থেকে Neon-এ connect হয় না | হোস্টকে 5432 খুলতে বলুন, **অথবা** Neon HTTPS driver `@prisma/adapter-neon` (port 443) ব্যবহার করুন |

> 💡 শেষেরটা CI/CD-র সমস্যা নয় — runner থেকে migration কাজ করে (GitHub-এর port খোলা), কিন্তু
> shared server থেকে runtime query টাইমআউট করে। এটা manual deploy-এও হতো।

---

## ৯. পরিচিত সীমাবদ্ধতা / পরের কাজ

- [ ] **DB `ETIMEDOUT`** — server থেকে Neon connection (port 5432 / HTTPS driver) — *এখনো বাকি*
- [ ] চাইলে staging branch + আলাদা workflow যোগ করা যায় (production-এর আগে test)

---

## সম্পর্কিত ফাইল
- `DEPLOYMENT.md` — পুরোনো manual deploy গাইড (background ও Prisma/cPanel detail এখানে আছে)
- `.github/workflows/deploy.yml` — actual pipeline
- `scripts/server-deploy.sh` — server-side deploy logic
