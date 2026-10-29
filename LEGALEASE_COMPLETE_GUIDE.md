# LegalEase — Complete Finish-the-Project Guide (Krina + Shalvi + Rishi)

One file. Follow it top to bottom. Written in simple language.

**Legend**
- 🤖 **AI TASK** = give the prompt to Antigravity (copy-paste).
- 🧑 **YOU DO IT** = AI cannot do this (sign-ups, API keys, clicking in a website, running on Colab). Do it yourself with the steps.
- ✅ **CHECK** = a small test to prove the step worked. Do not move on if the check fails.

**Team**
| Person | Part | Folder | Port |
|---|---|---|---|
| Krina | Frontend (React/Vite) | `frontend/` | 3000 |
| Shalvi | Backend (Express + Prisma + PostgreSQL + Redis) | `backend/` | 4000 |
| Rishi | AI/ML service (FastAPI) | `ai-service/` | 8000 |

> Folder names above are taken from your status file. If your real folder names are different, just tell Antigravity the real names in the Rules Header.

---

## PART 0 — Read this first (5 minutes)

### 0.1 Where you are now
- Overall about 78% done. Frontend 90%, Backend 80%, AI/ML 65%.
- **Everything is blocked because Rishi's AI service (port 8000) is not running.** So Rishi starts first.

### 0.2 IMPORTANT correction about the dataset plan
Your status file says to map "CUAD question titles" to your 12 clause types. But **CUAD does not have all 12.** CUAD has 41 categories and these are **missing** in CUAD: *Indemnification, Force Majeure, Confidentiality, Arbitration, Data Privacy, Payment Terms, Auto-Renewal (it only has "Renewal Term")*.

So we use **three data sources**:
1. **CUAD** – for termination, non-compete, liability, renewal, governing law, IP, payment-like clauses.
2. **LEDGAR** (part of LexGLUE) – for confidentiality, indemnification, arbitration, payments, and an "other" class.
3. **Keyword labelling (small, by script)** – for force_majeure and data_privacy, which no dataset covers.

We also add a **13th label called `other`** (normal text that is not a risky clause). Without it, the model will wrongly force every paragraph into one of 12 clauses.

### 0.3 Final label list (13 labels) — everyone must use these exact names
```
termination, non_compete, liability_limitation, auto_renewal, governing_law,
confidentiality, ip_ownership, indemnification, force_majeure, arbitration,
payment_terms, data_privacy, other
```

### 0.4 Which model for which job (download list)
| Job | Model / Tool | How you get it | Cost |
|---|---|---|---|
| Clause classification (the trained model) | `nlpaueb/legal-bert-base-uncased` (fine-tune it) | Downloaded automatically by `transformers` on Colab | Free |
| Summary + risk explanation + chat answers | OpenAI `gpt-4o-mini` (cheap) or `gpt-4o` (better) | API key | ~$5 credit is enough |
| Embeddings for chat (RAG) | OpenAI `text-embedding-3-small` (1536 dims) | Same OpenAI key | Very cheap |
| Vector database | Pinecone free tier (index dim **1536**, metric cosine) | pinecone.io | Free |
| Language detection | `langdetect` (Python package) | `pip install` | Free |
| OCR (scanned PDFs) | Tesseract + Poppler (programs) | Install on your PC | Free |
| PDF text | PyMuPDF (`fitz`) | `pip install` | Free |
| Free fallback if you have no OpenAI money | Google Gemini free API (`gemini-1.5-flash`) + `sentence-transformers/all-MiniLM-L6-v2` for embeddings (**384 dims** — Pinecone index must be 384 then) | Google AI Studio | Free |

You do NOT need to manually download Legal-BERT. The training script downloads it.

### 0.5 Datasets (download list)
| Dataset | Used for | Where |
|---|---|---|
| **CUAD v1** (≈ 500 contracts, 13k labels) | Main clause data | Official zip `CUAD_v1.zip` from the Atticus Project site (search "CUAD Atticus Project download"). Inside: `CUAD_v1.json`. |
| **LEDGAR** (from LexGLUE) | Confidentiality, indemnity, arbitration, payments, `other` | HuggingFace: `load_dataset("lex_glue", "ledgar")` |
| Your own 3–5 sample contracts (PDF) | Testing the full app | Download free NDA / rental / employment templates, or ask for sample PDFs |

> If `load_dataset("lex_glue","ledgar")` gives a "scripts are no longer supported" error, in Colab run `!pip install "datasets<3.0"` and restart runtime, then try again.

### 0.6 Rules every person follows
1. **Never put API keys in prompts, code, or GitHub.** Keys go only in `.env` files. Make sure `.env` is in `.gitignore`.
2. Use **git**. Each person works on own branch: `krina-frontend`, `shalvi-backend`, `rishi-ai`. Merge to `main` only after the ✅ check passes.
3. Ports are fixed: **3000 / 4000 / 8000**. Redis 6379. Don't change them.
4. If a step fails, copy the **full error text** and give it to Antigravity with the prompt in **Appendix A (Debug prompt)**.

### 0.7 RULES HEADER — paste this at the TOP of every Antigravity prompt
```
You are working inside the LegalEase project (AI contract analyzer).
Stack: Frontend React+Vite+TypeScript+Zustand (port 3000, folder frontend/),
Backend Node Express+Prisma+PostgreSQL+Redis+BullMQ (port 4000, folder backend/),
AI service Python FastAPI (port 8000, folder ai-service/).
Clause labels (exact names): termination, non_compete, liability_limitation, auto_renewal,
governing_law, confidentiality, ip_ownership, indemnification, force_majeure, arbitration,
payment_terms, data_privacy, other.
Rules: 1) First READ the existing code in the relevant folder and reuse existing files/names; do not rewrite working code.
2) Never hardcode secrets; read them from .env. 3) Make small changes, explain each changed file.
4) After the change, tell me the exact command to run and the exact result I should see.
5) If something is unclear, make the safest assumption and tell me what you assumed.
```
(If your folder names differ, edit the header once and reuse it.)

---

## PART 1 — Order of work (the big picture)

```
[x] STEP A  (Rishi, 30 min)      Start FastAPI on port 8000          ← ✅ DONE (Active on 127.0.0.1:8000)
STEP B  (all 3, same time)   Get keys + set up .env files         ← 🧑 you do it yourself
STEP C  (Rishi)              Dataset → train model on Colab       ← runs in background (1–3 hrs)
        (Shalvi)             Redis + BullMQ worker + SSE + E2E suite ← [x] ✅ DONE (Exit 0)
        (Krina)              Frontend API alignment [x] ✅ DONE | K4-K7 pending ← [ ] IN PROGRESS
STEP D  (Rishi)              Evaluate model → plug into ai-service
[x] STEP E  (Rishi)              OpenAI + Pinecone (summary + chat)   ← ✅ DONE
[x] STEP F  (all 3)              The agreed API format (contract) check ← ✅ DONE
STEP G  (all 3)              Full end-to-end test
STEP H  (all 3)              Final polish, README, demo, submission
```
Steps C-Rishi, C-Shalvi, C-Krina can run **at the same time** once Step A is done.

---

## PART 2 — STEP A: Start the AI service (Rishi) — [x] ✅ DONE

### A1. 🧑 YOU DO IT — install the programs (one time) — [x] ✅ DONE
1. **Python 3.10 or 3.11** (check: `python --version`).
2. **Tesseract OCR**
   - Windows: install from the UB-Mannheim Tesseract installer. Remember the path (usually `C:\Program Files\Tesseract-OCR\tesseract.exe`).
   - Mac: `brew install tesseract`  | Ubuntu: `sudo apt install tesseract-ocr`
3. **Poppler** (needed to turn PDF pages into images)
   - Windows: download "poppler for windows", unzip, add its `bin` folder to PATH.
   - Mac: `brew install poppler` | Ubuntu: `sudo apt install poppler-utils`
4. ✅ CHECK: `tesseract --version` prints a version.

### A2. 🧑 YOU DO IT — start the service — [x] ✅ DONE
```
cd LegalEase/ai-service
python -m venv venv
# Windows:  venv\Scripts\activate      Mac/Linux:  source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
✅ CHECK: open http://127.0.0.1:8000/health → shows `{"status":"ok"}`. Also open http://127.0.0.1:8000/docs.
Then message Shalvi: "port 8000 is UP". [x] ✅ VERIFIED: Returns `{"status":"ok","service":"ai-service","version":"2.0.0","classifier":"fallback"}`

### A3. 🤖 AI TASK — if it does not start (errors) — [x] ✅ DONE
```
[PASTE RULES HEADER]
TASK: ai-service/ will not start with uvicorn main:app on port 8000.
1. Read main.py, requirements.txt and every file imported by main.py.
2. Run it and read the error. Fix import errors, missing packages (update requirements.txt), wrong route registration.
3. Make sure these exist and return JSON: GET /health -> {"status":"ok"}; POST /internal/extract; POST /internal/classify; POST /internal/analyze (if present in the code).
4. Heavy libraries (torch/transformers/openai/pinecone) must be imported lazily or wrapped in try/except so the service STILL STARTS even if the model file or API keys are missing (use fallback mode and log a warning).
5. Add a CORS setting that allows http://localhost:4000 and http://localhost:3000.
Tell me the final command and the output of GET /health.
```

---

## PART 3 — STEP B: Get all keys (everyone, ~1 hour total) — 🧑 YOU DO IT

AI cannot create accounts. Do these yourself.

### B1. Rishi — OpenAI key
1. Go to platform.openai.com → sign in → Billing → add $5 credit.
2. API keys → Create new secret key → copy it (you see it only once).
3. In `ai-service/.env` add: `OPENAI_API_KEY=sk-...`
4. Also add: `OPENAI_CHAT_MODEL=gpt-4o-mini` and `OPENAI_EMBED_MODEL=text-embedding-3-small`
> No money? Use the free fallback (Gemini + MiniLM) — see Appendix C.

### B2. Rishi — Pinecone key
1. pinecone.io → sign up free → API Keys → copy key.
2. Create an index: name `legalease`, **dimension 1536**, metric **cosine**, serverless (default, free region).
3. `.env`: `PINECONE_API_KEY=...`, `PINECONE_INDEX=legalease`
   (If you use MiniLM embeddings, dimension must be **384**.)

### B3. Shalvi — SendGrid key
1. sendgrid.com → sign up free → Settings → API Keys → Create (Restricted: Mail Send is enough).
2. Settings → Sender Authentication → Single Sender Verification → verify your email.
3. `backend/.env`: `SENDGRID_API_KEY=SG...` and `SENDGRID_FROM_EMAIL=<verified email>`
4. Twilio: **skip** for now (optional). Demo without SMS.

### B4. Krina — Google OAuth (only if you want the real "Sign in with Google")
1. console.cloud.google.com → create project → APIs & Services → OAuth consent screen (External, add your email as test user).
2. Credentials → Create Credentials → OAuth client ID → Web application.
3. Authorized JavaScript origins: `http://localhost:3000`. Authorized redirect URI: use what Shalvi's backend expects (ask Shalvi), e.g. `http://localhost:4000/api/v1/auth/google/callback`.
4. Copy Client ID and Client Secret. Client ID goes in `frontend/.env` as `VITE_GOOGLE_CLIENT_ID`; Secret goes only in `backend/.env` (Shalvi).
> Not enough time? Hide the Google button or show "coming soon". Email login is enough for the demo.

### B5. Krina + Shalvi — Firebase VAPID key (push notifications)
1. Shalvi: Firebase Console → project `legalease-baff5` → Project settings → Cloud Messaging → Web Push certificates → Generate key pair → copy the **public key**.
2. Send it to Krina. Krina puts it in `frontend/.env`: `VITE_VAPID_PUBLIC_KEY=...`

### B6. Everyone — make `.env.example` files
🤖 Prompt (each person runs it in their own folder):
```
[PASTE RULES HEADER]
TASK: In my folder, create a .env.example listing every environment variable the code reads (names only, no real values, with a comment saying where to get it). Make sure .env is in .gitignore. Also add a startup check that prints a clear warning (not a crash) for each missing variable.
```

---

## PART 4 — STEP C (Rishi): Dataset + training the clause model

**Where to run:** Google Colab (free GPU). Not on your laptop.

### C1. 🧑 YOU DO IT — open Colab with GPU
1. colab.research.google.com → New notebook.
2. Runtime → Change runtime type → **T4 GPU** → Save.
3. First cell:
```python
from google.colab import drive
drive.mount('/content/drive')          # your files are saved here, safe if Colab disconnects
!mkdir -p /content/drive/MyDrive/legalease
!pip install -q transformers datasets accelerate evaluate scikit-learn pandas "datasets<3.0"
```
(After this cell: Runtime → Restart session if Colab asks, then run the other cells.)
✅ CHECK: `!nvidia-smi` shows a Tesla T4.

### C2. 🧑 YOU DO IT — get CUAD
1. On your PC download `CUAD_v1.zip` from the Atticus Project (official CUAD page).
2. Unzip. You need only `CUAD_v1.json`.
3. Upload it to Google Drive → `MyDrive/legalease/CUAD_v1.json`.

### C3. 🤖 AI TASK or paste yourself — build the dataset (Colab cell 2)
You can paste this code directly in Colab (it is complete). If you want Antigravity to adapt it, use the prompt below the code.

```python
import json, re, random, pandas as pd
from datasets import load_dataset
random.seed(42)

LABELS = ["termination","non_compete","liability_limitation","auto_renewal","governing_law",
          "confidentiality","ip_ownership","indemnification","force_majeure","arbitration",
          "payment_terms","data_privacy","other"]

# ---- 1) CUAD category -> our label (CUAD names are exactly these) ----
CUAD_MAP = {
 "Termination For Convenience":"termination",
 "Non-Compete":"non_compete", "No-Solicit Of Customers":"non_compete", "No-Solicit Of Employees":"non_compete",
 "Cap On Liability":"liability_limitation", "Uncapped Liability":"liability_limitation", "Liquidated Damages":"liability_limitation",
 "Renewal Term":"auto_renewal", "Notice Period To Terminate Renewal":"auto_renewal",
 "Governing Law":"governing_law",
 "Ip Ownership Assignment":"ip_ownership", "Joint Ip Ownership":"ip_ownership", "License Grant":"ip_ownership",
 "Revenue/Profit Sharing":"payment_terms", "Minimum Commitment":"payment_terms", "Price Restrictions":"payment_terms",
}

rows = []
data = json.load(open("/content/drive/MyDrive/legalease/CUAD_v1.json"))["data"]
for contract in data:
    for para in contract["paragraphs"]:
        ctx = para["context"]
        answer_spans = []
        for qa in para["qas"]:
            cat = qa["id"].split("__")[-1]
            for a in qa["answers"]:
                t = a["text"].strip()
                if len(t) < 30: continue
                answer_spans.append((a["answer_start"], a["answer_start"]+len(a["text"])))
                if cat in CUAD_MAP:
                    rows.append({"text": t[:1500], "label": CUAD_MAP[cat], "src":"cuad"})
        # "other" = random chunks of the contract that overlap NO labelled clause
        chunks = [m for m in re.finditer(r"[^\n]{80,600}", ctx)]
        random.shuffle(chunks)
        n=0
        for m in chunks:
            if any(not (m.end() < s or m.start() > e) for s,e in answer_spans): continue
            rows.append({"text": m.group(0).strip(), "label":"other", "src":"cuad_other"})
            n+=1
            if n>=8: break

# ---- 2) LEDGAR (provision label -> our label) ----
led = load_dataset("lex_glue","ledgar")
names = led["train"].features["label"].names
LED_MAP = {"Confidentiality":"confidentiality","Indemnifications":"indemnification","Indemnity":"indemnification",
           "Arbitration":"arbitration","Payments":"payment_terms","Fees":"payment_terms",
           "Terminations":"termination","Governing Laws":"governing_law","Applicable Laws":"governing_law",
           "Intellectual Property":"ip_ownership","Insurances":"other"}
OTHER_LED = {"Headings","Counterparts","Notices","Interpretations","Definitions","Headings","Further Assurances",
             "Severability","Entire Agreements","Amendments","Waivers","Titles","Survival","Binding Effect"}
cnt = {}
for split in ["train","validation","test"]:
    for ex in led[split]:
        nm = names[ex["label"]]
        lab = LED_MAP.get(nm) or ("other" if nm in OTHER_LED else None)
        if not lab: continue
        if cnt.get(lab,0) >= 1800: continue     # cap per class so classes stay balanced
        cnt[lab]=cnt.get(lab,0)+1
        rows.append({"text": ex["text"][:1500], "label": lab, "src":"ledgar"})

# ---- 3) keyword labelling for classes no dataset covers ----
KW = {
 "force_majeure": r"force majeure|act of god|acts of god|beyond (its|their) reasonable control",
 "data_privacy":  r"personal data|personal information|data protection|GDPR|privacy law|data subject|data breach",
}
pool = [r["text"] for r in rows if r["label"] in ("other","confidentiality")]
extra = {k:0 for k in KW}
for ex in led["train"]:
    t = ex["text"]
    for lab,pat in KW.items():
        if extra[lab] < 800 and re.search(pat, t, re.I):
            rows.append({"text": t[:1500], "label": lab, "src":"keyword"}); extra[lab]+=1
print("keyword counts:", extra)

df = pd.DataFrame(rows).drop_duplicates("text")
# balance: max 3000 per class
df = df.groupby("label", group_keys=False).apply(lambda g: g.sample(min(len(g),3000), random_state=42))
print(df.label.value_counts())

from sklearn.model_selection import train_test_split
tr, tmp = train_test_split(df, test_size=0.30, stratify=df.label, random_state=42)
va, te  = train_test_split(tmp, test_size=0.50, stratify=tmp.label, random_state=42)
for n,d in [("train",tr),("val",va),("test",te)]:
    d.to_csv(f"/content/drive/MyDrive/legalease/{n}.csv", index=False)
print(len(tr), len(va), len(te))
```
✅ CHECK: the printed table shows **all 13 labels**, each with **at least ~300 rows**. If `force_majeure` or `data_privacy` has fewer than 300, add more keywords to `KW` (e.g. `epidemic|pandemic|strike|natural disaster`).

**If the code errors, give Antigravity this prompt:**
```
[PASTE RULES HEADER]
TASK: This is a Google Colab data-prep script for a 13-class legal clause classifier (labels in the header).
Sources: CUAD_v1.json (SQuAD-style: data -> paragraphs -> context, qas with id "<contract>__<Category>" and answers[text, answer_start]), and LEDGAR via load_dataset("lex_glue","ledgar").
Fix the errors below, keep the same outputs: train.csv, val.csv, test.csv with columns text,label,src in /content/drive/MyDrive/legalease/. Print per-class counts at the end.
ERROR: <paste error>
SCRIPT: <paste script>
```

### C4. Train (Colab cell 3) — 🧑 run it, code is complete
```python
import pandas as pd, numpy as np, torch
from datasets import Dataset
from transformers import (AutoTokenizer, AutoModelForSequenceClassification,
                          TrainingArguments, Trainer, EarlyStoppingCallback)
from sklearn.metrics import f1_score, accuracy_score
from sklearn.utils.class_weight import compute_class_weight

P = "/content/drive/MyDrive/legalease/"
LABELS = ["termination","non_compete","liability_limitation","auto_renewal","governing_law",
          "confidentiality","ip_ownership","indemnification","force_majeure","arbitration",
          "payment_terms","data_privacy","other"]
l2i = {l:i for i,l in enumerate(LABELS)}; i2l = {i:l for l,i in l2i.items()}
tr, va, te = [pd.read_csv(P+f"{n}.csv") for n in ["train","val","test"]]
for d in (tr,va,te): d["labels"] = d.label.map(l2i)

MODEL = "nlpaueb/legal-bert-base-uncased"
tok = AutoTokenizer.from_pretrained(MODEL)
def enc(b): return tok(b["text"], truncation=True, max_length=256)
ds = {n: Dataset.from_pandas(d[["text","labels"]]).map(enc, batched=True) for n,d in [("train",tr),("val",va),("test",te)]}

model = AutoModelForSequenceClassification.from_pretrained(MODEL, num_labels=len(LABELS), id2label=i2l, label2id=l2i)

w = compute_class_weight("balanced", classes=np.arange(len(LABELS)), y=tr.labels.values)
w = torch.tensor(w, dtype=torch.float).to("cuda")
class WTrainer(Trainer):
    def compute_loss(self, model, inputs, return_outputs=False, **kw):
        labels = inputs.pop("labels"); out = model(**inputs)
        loss = torch.nn.functional.cross_entropy(out.logits, labels, weight=w)
        return (loss, out) if return_outputs else loss

def metrics(p):
    pred = p.predictions.argmax(-1)
    return {"macro_f1": f1_score(p.label_ids, pred, average="macro"), "acc": accuracy_score(p.label_ids, pred)}

args = TrainingArguments(
    output_dir=P+"checkpoints", num_train_epochs=4, learning_rate=2e-5,
    per_device_train_batch_size=16, per_device_eval_batch_size=32,
    warmup_ratio=0.1, weight_decay=0.01, fp16=True,
    eval_strategy="epoch", save_strategy="epoch", load_best_model_at_end=True,
    metric_for_best_model="macro_f1", save_total_limit=2, logging_steps=50, report_to="none")

trainer = WTrainer(model=model, args=args, train_dataset=ds["train"], eval_dataset=ds["val"],
                   tokenizer=tok, compute_metrics=metrics,
                   callbacks=[EarlyStoppingCallback(early_stopping_patience=2)])
trainer.train()                       # if Colab disconnected: trainer.train(resume_from_checkpoint=True)
trainer.save_model(P+"legalease-clause-classifier"); tok.save_pretrained(P+"legalease-clause-classifier")
print(trainer.evaluate(ds["test"], metric_key_prefix="test"))
```
- Time on T4: about **1–2 hours** (not overnight necessarily). You can leave it running.
- If you get "CUDA out of memory": change batch size 16 → 8.
- Colab disconnects: re-run C1, C3 not needed (csv saved), re-run C4 with `resume_from_checkpoint=True`.
- Alternative GPU: Kaggle Notebooks (free ~30 GPU hours/week).

### C5. 🧑 Evaluate (Colab cell 4)
```python
from sklearn.metrics import classification_report, confusion_matrix
pred = trainer.predict(ds["test"]); y = pred.predictions.argmax(-1)
print(classification_report(pred.label_ids, y, target_names=LABELS, digits=3))
```
Target: **macro F1 ≥ 0.80** (the status file said 0.82 — good goal, but 0.78–0.85 is normal with weak labels).
| Result | What to do |
|---|---|
| macro F1 ≥ 0.80 | Great → go to C6 |
| 0.70–0.80 | Change `learning_rate` to `3e-5`, epochs to 5, retrain once |
| < 0.70 | Look at the per-class table: the weak class usually has too few rows or noisy labels. Add data/keywords for that class, rebuild dataset, retrain |
Note in your report: `force_majeure` and `data_privacy` use keyword labels (weak), so expect them to be easier/less honest than the others — say this openly in your viva/report.

### C6. 🧑 Download the model into the project
1. In Drive: right-click folder `legalease-clause-classifier` → Download (zip).
2. Unzip into `LegalEase/ai-service/models/legalease-clause-classifier/` (it must contain `config.json`, `model.safetensors`, `tokenizer files`).
3. Add `ai-service/models/` to `.gitignore` (file is ~440 MB). Share it with teammates by Google Drive link, **or** upload to HuggingFace (optional): HuggingFace → New model → private → `trainer.push_to_hub(...)` with a token.
4. `.env`: `CLASSIFIER_MODEL_PATH=./models/legalease-clause-classifier`

---

## PART 5 — STEP D (Rishi): Plug the trained model into `classifier.py`

### D1. 🤖 AI TASK
```
[PASTE RULES HEADER]
TASK: Replace the TF-IDF zero-shot logic in ai-service/classifier.py with my fine-tuned model.
The model folder is at CLASSIFIER_MODEL_PATH (env var, default ./models/legalease-clause-classifier). It is a HuggingFace AutoModelForSequenceClassification with 13 labels (names are in model.config.id2label).
Requirements:
1. Load tokenizer+model ONCE at startup (lazy singleton), use GPU if available else CPU, torch.no_grad(), max_length 256.
2. Function classify_clauses(paragraphs: list[str]) -> list of {text, clause_type, confidence, probs_top3}. Process in batches of 16.
3. If confidence < 0.55 OR label == "other": mark clause_type "other" (do not show it as a risky clause).
4. KEEP the old TF-IDF code as automatic FALLBACK if the model folder is missing, and log which mode is used. Add the mode to GET /health -> {"status":"ok","classifier":"finetuned"|"fallback"}.
5. Split a document into clauses using blank lines / numbered headings (1., 1.1, (a), ARTICLE) and merge pieces shorter than 40 characters with the next one. Keep this in a function split_into_clauses(text).
6. Add a test file ai-service/tests/test_classifier.py with 6 example sentences (one per main clause type) and asserts.
Tell me how to run the tests.
```
✅ CHECK: `pytest ai-service/tests -q` passes, and `GET /health` shows `"classifier":"finetuned"`.

### D2. ✅ Real test
Take one real contract paragraph like *"Either party may terminate this Agreement for convenience upon thirty (30) days written notice."* → send to the classify endpoint → must return `termination`.

---

## PART 6 — STEP E (Rishi): Risk score, GPT summary, RAG chat — [x] ✅ DONE

### E1. 🤖 Risk scoring + missing clause check (no AI key needed) — [x] ✅ DONE
- Implemented in `ai-service/classification/risk_scoring.py` and `checklist.py`.
- Weighted average of clause risks + missing clause penalties matching agreed K3 schema.

### E2. 🤖 GPT-4o-mini summary + plain-English explanation of each risky clause — [x] ✅ DONE
- Implemented `ai-service/llm.py` with `summarize_contract()` and `explain_clause()`.
- Supports Groq, OpenAI, and deterministic non-lawyer fallback explanations.

### E3. 🤖 Pinecone RAG chat (ask questions about the uploaded contract) — [x] ✅ DONE
- Implemented in `ai-service/routers/internal_rag.py`.
- Added `POST /internal/chat/stream` for Server-Sent Events (SSE) token streaming with sources.

### E4. 🤖 One-shot pipeline endpoint — [x] ✅ DONE
- Registered `POST /internal/analyze` alias in `ai-service/routers/internal_classify.py` unifying extraction, classification, risk scoring, missing clause detection, and language translation.

---

## PART 7 — STEP C (Shalvi): Backend work (can run at the same time as Rishi's training)

### S1. 🧑 + ✅ Redis and the queue — [x] ✅ DONE
1. 🧑 Install Docker Desktop and start it.
2. In `backend/.env` set `ENABLE_REDIS=true`, `REDIS_URL=redis://localhost:6379`
3. 🧑 Run: `docker-compose up redis postgres -d`
4. ✅ CHECK: Redis running on port 6379 and PostgreSQL on 5432 verified.

### S2. 🤖 Make the BullMQ worker work — [x] ✅ DONE
- Worker runner script created: `backend/src/worker.ts` and `"worker"` added to `package.json`.
- GET `/api/v1/documents/:id/status` normalized returning `{status, stage, progress}`.
- Direct inline fallback enabled if Redis is offline.

### S3. 🤖 AI handshake test (after Rishi says port 8000 is up) — [x] ✅ DONE
- Created `backend/src/services/aiClient.ts` with typed methods for `health()`, `analyze()`, and `chat()`.
- Added startup connection check in `backend/src/server.ts`.
- Verified live handshake via `backend/scripts/testHandshake.ts` (Risk score 51, 10 clauses classified, 2 missing clauses flagged).

### S4. 🤖 SSE progress stream (Krina's /processing page needs this) — [x] ✅ DONE
- Added `GET /api/v1/documents/:id/stream` (SSE progress stream with stage reporting & heartbeat).
- Added `POST /api/v1/documents/:id/chat` (streaming SSE response proxy).

### S5. 🤖 SendGrid reminder emails — [x] ✅ DONE
- Configured in `backend/src/services/email.service.ts` with console fallback when `SENDGRID_API_KEY` is not set.
- Added `POST /api/v1/reminders/test` endpoint to trigger test reminder email and notification.

### S6. 🤖 Backend hardening (small but graders notice) — [x] ✅ DONE
- Helmet and rate limiting configured in `app.ts`.
- File validation (PDF/DOCX/PNG/JPG/WEBP/TIFF, max 25MB) enforced in `document.controller.ts`.
- Prisma password hash stripping and JWT authentication guards enforced.

### S7. 🤖 Backend test script (E2E from backend side) — [x] ✅ DONE
- Created `backend/scripts/e2e.ts` (register -> login -> upload PDF -> poll status -> fetch analysis -> test chat).
- Added `"test:e2e"` script to `backend/package.json`.

---

## PART 8 — STEP C (Krina): Frontend work (also at the same time)

### K1. 🧑 Start and note bugs
```
cd frontend
npm install
npm run dev
```
Open http://localhost:3000. Register → upload a PDF → watch /upload → /processing → /results. Write a list of everything that breaks (screenshots help).

### K2. 🤖 Fix API base URL (port 4000, not 5000) — [x] ✅ DONE
- Configured central `VITE_API_URL=http://localhost:4000/api/v1` in `frontend/.env` and `frontend/.env.example`.
- Axios client configured with JWT token attachment and 401 interception.

### K3. 🤖 Align the data types with the real backend (very important) — [x] ✅ DONE
- Verified `AnalysisResult` and `Clause` in `frontend/src/types/analysis.ts` and `frontend/src/api/analysis.ts` against Section K3 JSON specification.
- RiskGauge mapped to `risk_score` (0-100) and `risk_level`, Clause cards mapped to `clause_type`, `risk_level`, `explanation`, and `confidence`.

### K4. 🤖 SSE processing page + chat streaming — [ ] NOT DONE
- Chat streaming works via `useChatStream.ts` on `POST /documents/:id/chat`.
- ⚠️ Document processing status in `frontend/src/hooks/useDocumentStatus.ts` currently uses React Query HTTP polling instead of an `EventSource` connection to `GET /documents/:id/stream`. Needs update to native SSE with fallback.

### K5. 🤖 Push notifications (VAPID) — [ ] NOT DONE
- Missing `frontend/public/firebase-messaging-sw.js` service worker.
- Push registration fails in browser without service worker and active Firebase credentials.

### K6. 🤖 Google login (only if you got credentials; else skip) — [ ] NOT DONE
- `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` is empty.
- Button in `LoginPage.tsx` is disabled with "Google OAuth coming soon".

### K7. 🤖 UI polish for the demo — [ ] NOT DONE
- Mandatory "Not Legal Advice" disclaimer banner missing from footer of `ResultsPage.tsx` and `ChatPage.tsx`.
- Mobile responsive navigation and complete UI error toast states pending verification in browser subagent.

---

## PART 9 — STEP G: Full end-to-end test (all three together)

### G1. 🧑 Start 5 things (5 terminals)
| # | Who | Command | Expect |
|---|---|---|---|
| 1 | Shalvi | `docker-compose up redis postgres -d` | containers running |
| 2 | Rishi | `python -m uvicorn main:app --host 127.0.0.1 --port 8000` | `/health` ok, `classifier: finetuned` |
| 3 | Shalvi | `npm run dev` (backend, port 4000) | Swagger at `/docs` |
| 4 | Shalvi | `npm run worker` | "worker started" |
| 5 | Krina | `npm run dev` (frontend, port 3000) | page opens |

(If everyone is on one laptop, run all 5. If on different laptops, replace `127.0.0.1` with the laptop IP and open ports in the firewall.)

### G2. 🧑 Test flow (tick each box)
- [ ] Register → Login
- [ ] Upload a text PDF → processing steps move → results show
- [ ] Upload a **scanned** PDF/photo → OCR works
- [ ] Risk gauge number matches API
- [ ] Clauses list shows type, risk level, reason
- [ ] Missing clauses show
- [ ] Click a clause → PDF viewer jumps to the page
- [ ] Chat: ask "Can I terminate early?" → streamed answer + source
- [ ] Create a reminder → test email arrives
- [ ] Push permission prompt works
- [ ] Logout, wrong password, expired token handled
- [ ] Upload a 30 MB file → friendly error
- [ ] Stop the AI service → app shows a friendly error (no blank screen)

### G3. 🤖 If anything fails — Debug prompt (Appendix A) with logs from all 3 terminals.

---

## PART 10 — STEP H: Finish line (Day 2 evening)

### H1. 🤖 Docs and README
```
[PASTE RULES HEADER]
TASK: Create the root README.md: project description, architecture diagram (mermaid), features, tech stack, how to install and run all three services, env variables table (names only), API overview, model section (dataset sources CUAD + LEDGAR + keyword labels, 13 labels, Legal-BERT fine-tuned, metrics table: PASTE MY F1 RESULTS HERE), limitations (not legal advice, weak labels for force_majeure/data_privacy, English-focused), and screenshots placeholders.
```

### H2. 🧑 Things only you can do
1. Take screenshots of: login, upload, processing, results, chat, reminders.
2. Copy Rishi's `classification_report` into the README / report as the model evaluation table.
3. Record a 3-minute demo video (screen record the full flow once, on good internet).
4. Prepare 3 sample contracts: one safe, one risky, one scanned.
5. Rotate/remove any key that was ever pasted in a chat or committed to git.
6. Do a fresh-clone test: clone repo on another folder, follow the README only, confirm it runs.

### H3. Questions you should be ready to answer (viva)
- *Why Legal-BERT and not normal BERT?* It was pre-trained on legal text, so it understands legal wording better.
- *What data did you train on?* CUAD (expert-labelled contracts), LEDGAR (SEC contract provisions), plus keyword-labelled data for two classes.
- *Why a class `other`?* So normal sentences are not wrongly flagged.
- *How is the risk score calculated?* Rule-based weights per clause risk + penalty for missing clauses (rules are in one config).
- *What is RAG?* The chat finds the most relevant contract chunks (Pinecone) and the LLM answers only from them.
- *Limits?* Not legal advice, weak labels for two classes, mostly English.

---

## APPENDIX A — Debug prompt (use any time)
```
[PASTE RULES HEADER]
Something fails. Do this: 1) Read the error and the files in the stack trace. 2) Explain the root cause in 3 simple lines. 3) Fix with the smallest change. 4) Tell me how to confirm it is fixed.
WHAT I DID: <steps>
EXPECTED: <what should happen>
ACTUAL: <what happened>
LOGS: <paste full error / terminal output from the failing service>
```

## APPENDIX B — Time plan
| When | Rishi | Shalvi | Krina |
|---|---|---|---|
| Hour 0–1 | A: start port 8000 ✅ | S1 Redis, S3 handshake | K1 start + bug list, K2 port fix |
| Hour 1–3 | B1/B2 keys, C1–C3 dataset | S2 worker, B3 SendGrid | K3 types alignment |
| Hour 3–6 | C4 training (Colab runs alone), meanwhile E1 risk engine, E2 GPT | S4 SSE, S5 emails | K4 SSE+chat, K5 push |
| Day 2 morning | C5 evaluate, C6 download, D1 plug in | S6 hardening, S7 test script | K6 Google (optional), K7 polish |
| Day 2 afternoon | E3 RAG, E4 pipeline | help test | help test |
| Day 2 evening | G together, then H | G, H | G, H |

## APPENDIX C — No money? Free route
- Summaries/explanations: Google AI Studio free key → use Gemini (`gemini-1.5-flash`) with the `google-generativeai` package. Tell Antigravity: "replace the openai calls in llm.py with Gemini, same function names."
- Embeddings: `sentence-transformers/all-MiniLM-L6-v2` (runs locally, 384 dims) → create Pinecone index with **384** dimensions. Or skip Pinecone and use local FAISS/Chroma.
- Everything else (model training, OCR, PDF) is already free.

## APPENDIX D — Honest notes
- Model quality depends on data. If F1 is below your target, report it honestly with the per-class table; that is better than hiding it.
- Contract AI is for information only. Keep the "not legal advice" notice visible.
- Model and dataset sites change names/versions sometimes. If a download link or `load_dataset` name fails, search the exact dataset name ("CUAD Atticus", "LexGLUE LEDGAR") and give the new error to Antigravity with Appendix A.
