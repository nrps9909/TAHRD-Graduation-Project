```python
!export CPATH=/trinity/home/tna001/python39/include
!export CFLAGS="-I/trinity/home/tna001/python39/include/python3.9"

import os
os.environ["CPATH"] = "/trinity/home/tna001/python39/include/python3.9"
os.environ["C_INCLUDE_PATH"] = "/trinity/home/tna001/python39/include/python3.9"
os.environ["CFLAGS"] = "-I/trinity/home/tna001/python39/include/python3.9"

# 檢查設定是否正確（可選）
!echo $CPATH
!echo $C_INCLUDE_PATH
!echo $CFLAGS

```

    /trinity/home/tna001/python39/include/python3.9
    /trinity/home/tna001/python39/include/python3.9
    -I/trinity/home/tna001/python39/include/python3.9



```python
!pip install --upgrade pip
!pip install --upgrade pybind11 accelerate transformers peft datasets sentencepiece bitsandbytes faiss-gpu torch sentence-transformers ipywidgets wandb numpy==1.26.4
```

    Defaulting to user installation because normal site-packages is not writeable
    Requirement already satisfied: pip in ./.local/lib/python3.9/site-packages (25.0.1)
    Defaulting to user installation because normal site-packages is not writeable
    Requirement already satisfied: pybind11 in ./.local/lib/python3.9/site-packages (2.13.6)
    Requirement already satisfied: accelerate in ./.local/lib/python3.9/site-packages (1.3.0)
    Requirement already satisfied: transformers in ./.local/lib/python3.9/site-packages (4.48.3)
    Requirement already satisfied: peft in ./.local/lib/python3.9/site-packages (0.14.0)
    Requirement already satisfied: datasets in ./.local/lib/python3.9/site-packages (3.2.0)
    Requirement already satisfied: sentencepiece in ./.local/lib/python3.9/site-packages (0.2.0)
    Requirement already satisfied: bitsandbytes in ./.local/lib/python3.9/site-packages (0.45.2)
    Requirement already satisfied: faiss-gpu in ./.local/lib/python3.9/site-packages (1.7.2)
    Requirement already satisfied: torch in ./.local/lib/python3.9/site-packages (2.6.0)
    Requirement already satisfied: sentence-transformers in ./.local/lib/python3.9/site-packages (3.4.1)
    Requirement already satisfied: ipywidgets in ./.local/lib/python3.9/site-packages (8.1.5)
    Requirement already satisfied: wandb in ./.local/lib/python3.9/site-packages (0.19.6)
    Requirement already satisfied: numpy==1.26.4 in ./.local/lib/python3.9/site-packages (1.26.4)
    Requirement already satisfied: packaging>=20.0 in ./.local/lib/python3.9/site-packages (from accelerate) (24.2)
    Requirement already satisfied: psutil in /usr/local/lib64/python3.9/site-packages (from accelerate) (6.1.0)
    Requirement already satisfied: pyyaml in /usr/lib64/python3.9/site-packages (from accelerate) (5.4.1)
    Requirement already satisfied: huggingface-hub>=0.21.0 in ./.local/lib/python3.9/site-packages (from accelerate) (0.27.1)
    Requirement already satisfied: safetensors>=0.4.3 in ./.local/lib/python3.9/site-packages (from accelerate) (0.5.2)
    Requirement already satisfied: filelock in ./.local/lib/python3.9/site-packages (from transformers) (3.16.1)
    Requirement already satisfied: regex!=2019.12.17 in ./.local/lib/python3.9/site-packages (from transformers) (2024.11.6)
    Requirement already satisfied: requests in /usr/local/lib/python3.9/site-packages (from transformers) (2.32.3)
    Requirement already satisfied: tokenizers<0.22,>=0.21 in ./.local/lib/python3.9/site-packages (from transformers) (0.21.0)
    Requirement already satisfied: tqdm>=4.27 in /usr/local/lib/python3.9/site-packages (from transformers) (4.66.6)
    Requirement already satisfied: pyarrow>=15.0.0 in ./.local/lib/python3.9/site-packages (from datasets) (18.1.0)
    Requirement already satisfied: dill<0.3.9,>=0.3.0 in ./.local/lib/python3.9/site-packages (from datasets) (0.3.8)
    Requirement already satisfied: pandas in ./.local/lib/python3.9/site-packages (from datasets) (2.2.3)
    Requirement already satisfied: xxhash in ./.local/lib/python3.9/site-packages (from datasets) (3.5.0)
    Requirement already satisfied: multiprocess<0.70.17 in ./.local/lib/python3.9/site-packages (from datasets) (0.70.16)
    Requirement already satisfied: fsspec<=2024.9.0,>=2023.1.0 in ./.local/lib/python3.9/site-packages (from fsspec[http]<=2024.9.0,>=2023.1.0->datasets) (2024.9.0)
    Requirement already satisfied: aiohttp in ./.local/lib/python3.9/site-packages (from datasets) (3.11.12)
    Requirement already satisfied: typing-extensions>=4.10.0 in /usr/local/lib/python3.9/site-packages (from torch) (4.12.2)
    Requirement already satisfied: networkx in ./.local/lib/python3.9/site-packages (from torch) (3.2.1)
    Requirement already satisfied: jinja2 in /usr/local/lib/python3.9/site-packages (from torch) (3.1.4)
    Requirement already satisfied: nvidia-cuda-nvrtc-cu12==12.4.127 in ./.local/lib/python3.9/site-packages (from torch) (12.4.127)
    Requirement already satisfied: nvidia-cuda-runtime-cu12==12.4.127 in ./.local/lib/python3.9/site-packages (from torch) (12.4.127)
    Requirement already satisfied: nvidia-cuda-cupti-cu12==12.4.127 in ./.local/lib/python3.9/site-packages (from torch) (12.4.127)
    Requirement already satisfied: nvidia-cudnn-cu12==9.1.0.70 in ./.local/lib/python3.9/site-packages (from torch) (9.1.0.70)
    Requirement already satisfied: nvidia-cublas-cu12==12.4.5.8 in ./.local/lib/python3.9/site-packages (from torch) (12.4.5.8)
    Requirement already satisfied: nvidia-cufft-cu12==11.2.1.3 in ./.local/lib/python3.9/site-packages (from torch) (11.2.1.3)
    Requirement already satisfied: nvidia-curand-cu12==10.3.5.147 in ./.local/lib/python3.9/site-packages (from torch) (10.3.5.147)
    Requirement already satisfied: nvidia-cusolver-cu12==11.6.1.9 in ./.local/lib/python3.9/site-packages (from torch) (11.6.1.9)
    Requirement already satisfied: nvidia-cusparse-cu12==12.3.1.170 in ./.local/lib/python3.9/site-packages (from torch) (12.3.1.170)
    Requirement already satisfied: nvidia-cusparselt-cu12==0.6.2 in ./.local/lib/python3.9/site-packages (from torch) (0.6.2)
    Requirement already satisfied: nvidia-nccl-cu12==2.21.5 in ./.local/lib/python3.9/site-packages (from torch) (2.21.5)
    Requirement already satisfied: nvidia-nvtx-cu12==12.4.127 in ./.local/lib/python3.9/site-packages (from torch) (12.4.127)
    Requirement already satisfied: nvidia-nvjitlink-cu12==12.4.127 in ./.local/lib/python3.9/site-packages (from torch) (12.4.127)
    Requirement already satisfied: triton==3.2.0 in ./.local/lib/python3.9/site-packages (from torch) (3.2.0)
    Requirement already satisfied: sympy==1.13.1 in ./.local/lib/python3.9/site-packages (from torch) (1.13.1)
    Requirement already satisfied: mpmath<1.4,>=1.1.0 in ./.local/lib/python3.9/site-packages (from sympy==1.13.1->torch) (1.3.0)
    Requirement already satisfied: scikit-learn in ./.local/lib/python3.9/site-packages (from sentence-transformers) (1.6.1)
    Requirement already satisfied: scipy in ./.local/lib/python3.9/site-packages (from sentence-transformers) (1.13.1)
    Requirement already satisfied: Pillow in ./.local/lib/python3.9/site-packages (from sentence-transformers) (11.1.0)
    Requirement already satisfied: comm>=0.1.3 in /usr/local/lib/python3.9/site-packages (from ipywidgets) (0.2.2)
    Requirement already satisfied: ipython>=6.1.0 in /usr/local/lib/python3.9/site-packages (from ipywidgets) (8.18.1)
    Requirement already satisfied: traitlets>=4.3.1 in /usr/local/lib/python3.9/site-packages (from ipywidgets) (5.14.3)
    Requirement already satisfied: widgetsnbextension~=4.0.12 in ./.local/lib/python3.9/site-packages (from ipywidgets) (4.0.13)
    Requirement already satisfied: jupyterlab-widgets~=3.0.12 in ./.local/lib/python3.9/site-packages (from ipywidgets) (3.0.13)
    Requirement already satisfied: click!=8.0.0,>=7.1 in ./.local/lib/python3.9/site-packages (from wandb) (8.1.8)
    Requirement already satisfied: docker-pycreds>=0.4.0 in ./.local/lib/python3.9/site-packages (from wandb) (0.4.0)
    Requirement already satisfied: eval-type-backport in ./.local/lib/python3.9/site-packages (from wandb) (0.2.2)
    Requirement already satisfied: gitpython!=3.1.29,>=1.0.0 in ./.local/lib/python3.9/site-packages (from wandb) (3.1.44)
    Requirement already satisfied: platformdirs in /usr/local/lib/python3.9/site-packages (from wandb) (4.3.6)
    Requirement already satisfied: protobuf!=4.21.0,!=5.28.0,<6,>=3.15.0 in ./.local/lib/python3.9/site-packages (from wandb) (5.29.3)
    Requirement already satisfied: pydantic<3,>=2.6 in ./.local/lib/python3.9/site-packages (from wandb) (2.10.5)
    Requirement already satisfied: sentry-sdk>=2.0.0 in ./.local/lib/python3.9/site-packages (from wandb) (2.20.0)
    Requirement already satisfied: setproctitle in ./.local/lib/python3.9/site-packages (from wandb) (1.3.4)
    Requirement already satisfied: setuptools in /usr/lib/python3.9/site-packages (from wandb) (53.0.0)
    Requirement already satisfied: six>=1.4.0 in /usr/lib/python3.9/site-packages (from docker-pycreds>=0.4.0->wandb) (1.15.0)
    Requirement already satisfied: aiohappyeyeballs>=2.3.0 in ./.local/lib/python3.9/site-packages (from aiohttp->datasets) (2.4.6)
    Requirement already satisfied: aiosignal>=1.1.2 in ./.local/lib/python3.9/site-packages (from aiohttp->datasets) (1.3.2)
    Requirement already satisfied: async-timeout<6.0,>=4.0 in /usr/lib/python3.9/site-packages (from aiohttp->datasets) (4.0.2)
    Requirement already satisfied: attrs>=17.3.0 in /usr/local/lib/python3.9/site-packages (from aiohttp->datasets) (24.2.0)
    Requirement already satisfied: frozenlist>=1.1.1 in ./.local/lib/python3.9/site-packages (from aiohttp->datasets) (1.5.0)
    Requirement already satisfied: multidict<7.0,>=4.5 in ./.local/lib/python3.9/site-packages (from aiohttp->datasets) (6.1.0)
    Requirement already satisfied: propcache>=0.2.0 in ./.local/lib/python3.9/site-packages (from aiohttp->datasets) (0.2.1)
    Requirement already satisfied: yarl<2.0,>=1.17.0 in ./.local/lib/python3.9/site-packages (from aiohttp->datasets) (1.18.3)
    Requirement already satisfied: gitdb<5,>=4.0.1 in ./.local/lib/python3.9/site-packages (from gitpython!=3.1.29,>=1.0.0->wandb) (4.0.12)
    Requirement already satisfied: decorator in /usr/local/lib/python3.9/site-packages (from ipython>=6.1.0->ipywidgets) (5.1.1)
    Requirement already satisfied: jedi>=0.16 in /usr/local/lib/python3.9/site-packages (from ipython>=6.1.0->ipywidgets) (0.19.1)
    Requirement already satisfied: matplotlib-inline in /usr/local/lib/python3.9/site-packages (from ipython>=6.1.0->ipywidgets) (0.1.7)
    Requirement already satisfied: prompt-toolkit<3.1.0,>=3.0.41 in /usr/local/lib/python3.9/site-packages (from ipython>=6.1.0->ipywidgets) (3.0.48)
    Requirement already satisfied: pygments>=2.4.0 in /usr/local/lib/python3.9/site-packages (from ipython>=6.1.0->ipywidgets) (2.18.0)
    Requirement already satisfied: stack-data in /usr/local/lib/python3.9/site-packages (from ipython>=6.1.0->ipywidgets) (0.6.3)
    Requirement already satisfied: exceptiongroup in /usr/local/lib/python3.9/site-packages (from ipython>=6.1.0->ipywidgets) (1.2.2)
    Requirement already satisfied: pexpect>4.3 in /usr/local/lib/python3.9/site-packages (from ipython>=6.1.0->ipywidgets) (4.9.0)
    Requirement already satisfied: annotated-types>=0.6.0 in ./.local/lib/python3.9/site-packages (from pydantic<3,>=2.6->wandb) (0.7.0)
    Requirement already satisfied: pydantic-core==2.27.2 in ./.local/lib/python3.9/site-packages (from pydantic<3,>=2.6->wandb) (2.27.2)
    Requirement already satisfied: charset-normalizer<4,>=2 in /usr/local/lib64/python3.9/site-packages (from requests->transformers) (3.4.0)
    Requirement already satisfied: idna<4,>=2.5 in /usr/lib/python3.9/site-packages (from requests->transformers) (2.10)
    Requirement already satisfied: urllib3<3,>=1.21.1 in ./.local/lib/python3.9/site-packages (from requests->transformers) (2.3.0)
    Requirement already satisfied: certifi>=2017.4.17 in /usr/local/lib/python3.9/site-packages (from requests->transformers) (2024.8.30)
    Requirement already satisfied: MarkupSafe>=2.0 in /usr/local/lib64/python3.9/site-packages (from jinja2->torch) (3.0.2)
    Requirement already satisfied: python-dateutil>=2.8.2 in /usr/local/lib/python3.9/site-packages (from pandas->datasets) (2.9.0.post0)
    Requirement already satisfied: pytz>=2020.1 in ./.local/lib/python3.9/site-packages (from pandas->datasets) (2024.2)
    Requirement already satisfied: tzdata>=2022.7 in ./.local/lib/python3.9/site-packages (from pandas->datasets) (2024.2)
    Requirement already satisfied: joblib>=1.2.0 in ./.local/lib/python3.9/site-packages (from scikit-learn->sentence-transformers) (1.4.2)
    Requirement already satisfied: threadpoolctl>=3.1.0 in ./.local/lib/python3.9/site-packages (from scikit-learn->sentence-transformers) (3.5.0)
    Requirement already satisfied: smmap<6,>=3.0.1 in ./.local/lib/python3.9/site-packages (from gitdb<5,>=4.0.1->gitpython!=3.1.29,>=1.0.0->wandb) (5.0.2)
    Requirement already satisfied: parso<0.9.0,>=0.8.3 in /usr/local/lib/python3.9/site-packages (from jedi>=0.16->ipython>=6.1.0->ipywidgets) (0.8.4)
    Requirement already satisfied: ptyprocess>=0.5 in /usr/local/lib/python3.9/site-packages (from pexpect>4.3->ipython>=6.1.0->ipywidgets) (0.7.0)
    Requirement already satisfied: wcwidth in /usr/local/lib/python3.9/site-packages (from prompt-toolkit<3.1.0,>=3.0.41->ipython>=6.1.0->ipywidgets) (0.2.13)
    Requirement already satisfied: executing>=1.2.0 in /usr/local/lib/python3.9/site-packages (from stack-data->ipython>=6.1.0->ipywidgets) (2.1.0)
    Requirement already satisfied: asttokens>=2.1.0 in /usr/local/lib/python3.9/site-packages (from stack-data->ipython>=6.1.0->ipywidgets) (2.4.1)
    Requirement already satisfied: pure-eval in /usr/local/lib/python3.9/site-packages (from stack-data->ipython>=6.1.0->ipywidgets) (0.2.3)



```python
import os
os.environ["TOKENIZERS_PARALLELISM"] = "false"  # 避免 tokenizers 的 fork 警告
import torch

# 建議在較新型號的 GPU 上開啟以下加速選項
torch.backends.cudnn.benchmark = True
# torch.set_float32_matmul_precision("medium")  # 如有需要可調整精度

from datasets import load_dataset
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    default_data_collator,
    BitsAndBytesConfig,
)
from peft import LoraConfig, get_peft_model, PeftModel
import wandb

# 設定每張 GPU 的最大記憶體（兩張 A10G 24GB）
max_memory = {i: "24GB" for i in range(torch.cuda.device_count())}

# 4-bit 量化設定
quant_config = BitsAndBytesConfig(
    load_in_4bit=True,                  
    bnb_4bit_use_double_quant=True,     
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",          # 常用於 LLaMA / QLoRA
)

model_name = "yentinglin/Llama-3-Taiwan-8B-Instruct"

# 載入模型（同時根據 max_memory 自動分配到兩張 GPU）
model = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto",
    max_memory=max_memory,
    torch_dtype=torch.float16,
    quantization_config=quant_config,
)

tokenizer = AutoTokenizer.from_pretrained(
    model_name,
    use_fast=False  # LLaMA tokenizer 通常不支援 fast
)

# LoRA 設定（可依需求調整 r 與 target_modules）
lora_config = LoraConfig(
    r=16,                         
    lora_alpha=32,
    target_modules=["q_proj", "v_proj"],  # 依模型結構調整
    lora_dropout=0.05,
    bias="none",
    task_type="CAUSAL_LM",
)

# 將 LoRA 套用至模型
model = get_peft_model(model, lora_config)
model.print_trainable_parameters()  # 查看可訓練參數數量
```


    Loading checkpoint shards:   0%|          | 0/4 [00:00<?, ?it/s]


    trainable params: 6,815,744 || all params: 8,037,093,376 || trainable%: 0.0848



```python
# 載入訓練資料（JSON 格式）
data_files = {"train": "data/hugging_bear.json"}
raw_datasets = load_dataset("json", data_files=data_files)

# 定義 prompt 格式化函式
def format_example(ex):
    instruction = ex["instruction"]
    context = ex.get("context", "")
    response = ex["response"]
    if context:
        prompt = f"Human: {instruction}\n{context}\nAssistant:"
    else:
        prompt = f"Human: {instruction}\nAssistant:"
    return prompt, response

# 定義資料預處理函式（將 prompt 與回答轉換成模型所需的 input_ids 與 labels）
def preprocess_function(examples):
    all_input_ids = []
    all_labels = []
    for instruction, context, response in zip(
        examples["instruction"],
        examples["context"],
        examples["response"]
    ):
        prompt, ans = format_example({
            "instruction": instruction,
            "context": context,
            "response": response
        })
        prompt_ids = tokenizer(prompt, add_special_tokens=False)["input_ids"]
        answer_ids = tokenizer(ans, add_special_tokens=False)["input_ids"]
        # QLoRA 同樣是 Causal LM 做法：prompt + answer 拼接
        input_ids = prompt_ids + answer_ids
        # 對 prompt 部分標記 -100 以忽略 loss 計算
        labels = [-100] * len(prompt_ids) + answer_ids

        max_length = 512
        if len(input_ids) > max_length:
            input_ids = input_ids[:max_length]
            labels = labels[:max_length]

        all_input_ids.append(input_ids)
        all_labels.append(labels)

    return {"input_ids": all_input_ids, "labels": all_labels}

# 使用 map() 預處理資料
processed_dataset = raw_datasets.map(preprocess_function, batched=True)
train_dataset = processed_dataset["train"]
```


```python
# 訓練參數設定（可根據顯存情況調整 per_device_train_batch_size 與 gradient_accumulation_steps）
training_args = TrainingArguments(
    output_dir="./lora-llama3-taiwan-8b-instruct",
    overwrite_output_dir=True,
    num_train_epochs=1,
    per_device_train_batch_size=1,        # 若顯存足夠，可調大，例如改成 2
    gradient_accumulation_steps=4,          # 調整以達成合適的有效 batch size
    logging_steps=10,
    save_steps=100,
    eval_strategy="no",                     # 若有驗證集可改 "steps" 或 "epoch"
    fp16=True,                            # 使用半精度訓練
    learning_rate=1e-4,
    max_grad_norm=1.0,                      # 加入梯度裁剪（可避免梯度爆炸）
    logging_dir="./logs",                   # 設定 TensorBoard log 目錄
    # gradient_checkpointing=True,         # 如需進一步節省顯存，可開啟此選項
    # torch_compile=True,                  # PyTorch 2.0+ 可嘗試啟用以加速
)

data_collator = default_data_collator  # 採用預設 collator（動態 padding）

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=train_dataset,
    data_collator=data_collator,
)

# 開始訓練
trainer.train()
trainer.save_model("./lora-llama3-taiwan-8b-instruct")
# 若要上傳到 Hugging Face Hub，可使用：
# trainer.push_to_hub("your-username/my-qlora-llama3-taiwan-8b-instruct")

########################################
# 以下為推論程式碼
########################################

# 載入基底模型（4-bit）並指定 max_memory
base_model_for_inference = AutoModelForCausalLM.from_pretrained(
    model_name,
    device_map="auto",
    max_memory=max_memory,
    torch_dtype=torch.float16,
    quantization_config=quant_config,  # 一定要和訓練時對應
)

# 套用 LoRA 權重
lora_model_path = "./lora-llama3-taiwan-8b-instruct"
inference_model = PeftModel.from_pretrained(base_model_for_inference, lora_model_path)
inference_model.eval()

import re

# 定義後處理函式，用以將回答裁切成最多兩句話
def postprocess_short_answer(text, max_sentences=2):
    # 依句號、問號、驚嘆號分割文字
    sentences = re.split(r'([.!?])', text)
    short_text = []
    count = 0
    # sentences 內會交錯出現句子與標點，故每兩個元素合併成一句
    for i in range(0, len(sentences), 2):
        short_text.append(sentences[i])
        if i + 1 < len(sentences):
            short_text.append(sentences[i + 1])
        count += 1
        if count >= max_sentences:
            break
    return "".join(short_text).strip()
```

    [34m[1mwandb[0m: [33mWARNING[0m The `run_name` is currently set to the same value as `TrainingArguments.output_dir`. If this was not intended, please specify a different run name by setting the `TrainingArguments.run_name` parameter.
    Failed to detect the name of this notebook, you can set it manually with the WANDB_NOTEBOOK_NAME environment variable to enable code saving.
    [34m[1mwandb[0m: Currently logged in as: [33mnrps9909[0m ([33mnrps9909-national-taiwan-university[0m) to [32mhttps://api.wandb.ai[0m. Use [1m`wandb login --relogin`[0m to force relogin
    [34m[1mwandb[0m: Using wandb-core as the SDK backend.  Please refer to https://wandb.me/wandb-core for more information.



Tracking run with wandb version 0.19.6



Run data is saved locally in <code>/trinity/home/tna001/wandb/run-20250213_091812-cx87aizs</code>



Syncing run <strong><a href='https://wandb.ai/nrps9909-national-taiwan-university/huggingface/runs/cx87aizs' target="_blank">./lora-llama3-taiwan-8b-instruct</a></strong> to <a href='https://wandb.ai/nrps9909-national-taiwan-university/huggingface' target="_blank">Weights & Biases</a> (<a href='https://wandb.me/developer-guide' target="_blank">docs</a>)<br>



View project at <a href='https://wandb.ai/nrps9909-national-taiwan-university/huggingface' target="_blank">https://wandb.ai/nrps9909-national-taiwan-university/huggingface</a>



View run at <a href='https://wandb.ai/nrps9909-national-taiwan-university/huggingface/runs/cx87aizs' target="_blank">https://wandb.ai/nrps9909-national-taiwan-university/huggingface/runs/cx87aizs</a>




    <div>

      <progress value='215' max='215' style='width:300px; height:20px; vertical-align: middle;'></progress>
      [215/215 05:46, Epoch 0/1]
    </div>
    <table border="1" class="dataframe">
  <thead>
 <tr style="text-align: left;">
      <th>Step</th>
      <th>Training Loss</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>10</td>
      <td>4.068500</td>
    </tr>
    <tr>
      <td>20</td>
      <td>3.543200</td>
    </tr>
    <tr>
      <td>30</td>
      <td>3.632300</td>
    </tr>
    <tr>
      <td>40</td>
      <td>3.362400</td>
    </tr>
    <tr>
      <td>50</td>
      <td>3.278600</td>
    </tr>
    <tr>
      <td>60</td>
      <td>3.440000</td>
    </tr>
    <tr>
      <td>70</td>
      <td>3.338100</td>
    </tr>
    <tr>
      <td>80</td>
      <td>3.391700</td>
    </tr>
    <tr>
      <td>90</td>
      <td>3.251400</td>
    </tr>
    <tr>
      <td>100</td>
      <td>3.320100</td>
    </tr>
    <tr>
      <td>110</td>
      <td>3.435300</td>
    </tr>
    <tr>
      <td>120</td>
      <td>3.128700</td>
    </tr>
    <tr>
      <td>130</td>
      <td>3.123300</td>
    </tr>
    <tr>
      <td>140</td>
      <td>3.113700</td>
    </tr>
    <tr>
      <td>150</td>
      <td>3.409600</td>
    </tr>
    <tr>
      <td>160</td>
      <td>3.302200</td>
    </tr>
    <tr>
      <td>170</td>
      <td>3.249300</td>
    </tr>
    <tr>
      <td>180</td>
      <td>3.249200</td>
    </tr>
    <tr>
      <td>190</td>
      <td>3.522400</td>
    </tr>
    <tr>
      <td>200</td>
      <td>3.257300</td>
    </tr>
    <tr>
      <td>210</td>
      <td>3.416200</td>
    </tr>
  </tbody>
</table><p>



    Loading checkpoint shards:   0%|          | 0/4 [00:00<?, ?it/s]



```python
# 修改 generate_answer()，使生成提示與後處理一致（使用「最多兩句話回應」）
def generate_answer(prompt, max_new_tokens=256):
    short_prompt = f"Human: 請用最多兩句話回應以下問題：\n{prompt}\nAssistant:"
    inputs = tokenizer(short_prompt, return_tensors="pt").to(inference_model.device)
    with torch.no_grad():
        outputs = inference_model.generate(
            **inputs,
            max_new_tokens=max_new_tokens,
            do_sample=True,
            temperature=0.7,
            top_p=0.9,
            repetition_penalty=1.2,
            pad_token_id=tokenizer.eos_token_id  # 明確設定 pad_token_id
        )
    answer = tokenizer.decode(outputs[0], skip_special_tokens=True)
    short_answer = postprocess_short_answer(answer, max_sentences=2)
    return short_answer
```


```python
# 測試推論
test_prompt = "我最近有一個新的喜歡的女生，我在想要不要跟原本的女朋友分手，你覺得呢"
answer = generate_answer(test_prompt)
print("=== 推論結果 ===")
print(answer)
```

    === 推論結果 ===
    Human: 請用最多兩句話回應以下問題：
    我最近有一個新的喜歡的女生，我在想要不要跟原本的女朋友分手，你覺得呢
    Assistant:不建議 分一樣是人類 但你們本來就是沒有感情了吧？現在還有什麼好失去的。只是這些都是以後的事啦！對方也要真的愛你 而且比她更優秀才行（因為你們都沒感情）..



```python
import os
import re
import torch
import faiss
import numpy as np
import threading
import ipywidgets as widgets
from IPython.display import display
from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
from peft import PeftModel
from sentence_transformers import SentenceTransformer
import logging

# 設定 logging 格式與層級
logging.basicConfig(level=logging.DEBUG, format='[%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

#############################################
# 輔助函數：移除特殊 token 與 emoji 以及過濾亂碼
#############################################
def remove_emojis(text: str) -> str:
    emoji_pattern = re.compile(
        "[" 
        "\U0001F600-\U0001F64F"  # 表情符號
        "\U0001F300-\U0001F5FF"  # 符號與圖示
        "\U0001F680-\U0001F6FF"  # 交通工具與地圖
        "\U0001F1E0-\U0001F1FF"  # 國旗
        "]+", flags=re.UNICODE)
    return emoji_pattern.sub(r'', text)

def remove_special_tokens(text: str) -> str:
    tokens_to_remove = ["</s>", "<|im_end|>", "<|begin_of_text|>", "<|endoftext|>"]
    for token in tokens_to_remove:
        text = text.replace(token, "")
    text = re.sub(r"<\|.*?\|>", "", text)
    text = remove_emojis(text)
    return text.strip()

def filter_gibberish(text: str) -> str:
    """
    移除過長且只由英文字母、數字及特定符號組成的片段，避免亂碼
    """
    tokens = text.split()
    filtered_tokens = []
    for token in tokens:
        if re.fullmatch(r'[A-Za-z0-9+\-#^_]{8,}', token):
            continue
        filtered_tokens.append(token)
    return " ".join(filtered_tokens)

#############################################
# 1. 模型與 Tokenizer 的初始化
#############################################
def setup_model(model_path: str):
    os.environ["TOKENIZERS_PARALLELISM"] = "false"
    logger.debug("設定 TOKENIZERS_PARALLELISM 為 false")
    
    try:
        logger.debug("設定量化參數並載入模型")
        quant_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_use_double_quant=True,
            bnb_4bit_compute_dtype=torch.float16,
            bnb_4bit_quant_type="nf4",
        )
        max_memory = {i: "24GB" for i in range(torch.cuda.device_count())}
        
        base_model = AutoModelForCausalLM.from_pretrained(
            model_path,
            device_map="auto",
            max_memory=max_memory,
            torch_dtype=torch.float16,
            quantization_config=quant_config,
        )
        logger.debug("Base model 載入成功")
        
        tokenizer = AutoTokenizer.from_pretrained("yentinglin/Llama-3-Taiwan-8B-Instruct", use_fast=False)
        logger.debug("Tokenizer 載入成功")
        
        inference_model = PeftModel.from_pretrained(base_model, model_path)
        inference_model.eval()
        logger.debug("LoRA 權重已套用，模型設定為 eval 模式")
        
        return tokenizer, inference_model
    except Exception as e:
        logger.exception("模型載入時發生錯誤")
        raise

#############################################
# 2. FAISS 與 SentenceTransformer 初始化
#############################################
def setup_faiss():
    try:
        logger.debug("載入 SentenceTransformer 模型")
        embedding_model = SentenceTransformer('paraphrase-MiniLM-L6-v2', device='cuda')
        embedding_dim = embedding_model.get_sentence_embedding_dimension()
        logger.debug(f"SentenceTransformer 載入成功，嵌入維度: {embedding_dim}")

        logger.debug("建立 FAISS CPU 索引")
        faiss_index = faiss.IndexFlatL2(embedding_dim)
        logger.debug("FAISS 索引建立成功")
        
        return embedding_model, faiss_index
    except Exception as e:
        logger.exception("建立 FAISS 索引時發生錯誤")
        raise

#############################################
# 3. 對話歷史管理與文件儲存
#############################################
conversation_history = []   # 儲存 (role, message)
document_store = []         # 儲存所有加入索引的文字

def append_history(role: str, message: str):
    conversation_history.append((role, message))

def get_recent_context(num_turns: int = 1) -> str:
    history = conversation_history[-(num_turns * 2):]
    context = ""
    for role, msg in history:
        context += f"{role}: {msg}\n"
    return context.strip()

#############################################
# 4. 回應後處理與提取函數
#############################################
def remove_urls(text: str) -> str:
    text = re.sub(r"://\S+", "", text)
    return text.strip()

def extract_generated_answer(full_response: str, prompt: str) -> str:
    logger.debug("extract_generated_answer: 從 full_response 中提取回答")
    candidate = full_response[len(prompt):].strip() if full_response.startswith(prompt) else full_response.strip()
    candidate = remove_special_tokens(candidate)
    candidate = filter_gibberish(candidate)
    parts = re.split(r"Assistant[:：]", candidate)
    result = parts[-1].strip() if len(parts) > 1 else candidate
    result = re.split(r"User[:：]", result)[0].strip()
    result = remove_urls(result)
    logger.debug("extract_generated_answer: 提取後結果 -> " + result)
    return result

def postprocess_answer(text: str, max_sentences: int = 2) -> str:
    logger.debug("postprocess_answer: 開始處理回答")
    text = remove_special_tokens(text)
    text = filter_gibberish(text)
    text = re.sub(r"://\S+", "", text)
    paragraphs = re.split(r"\n\s*\n", text)
    text = paragraphs[0].strip() if paragraphs else text
    sentences = re.split(r"[.!?。！？]", text)
    sentences = [s.strip() for s in sentences if s.strip()]
    short_sentences = sentences[:max_sentences]
    output = ". ".join(short_sentences)
    if output and output[-1] not in ".。！？":
        output += '.'
    logger.debug("postprocess_answer: 處理後回答 -> " + output)
    return output

#############################################
# 5. 檢索函數：從 FAISS 索引中檢索相關文件
#############################################
def retrieve_documents(query: str, embedding_model, faiss_index, top_k: int = 3):
    logger.debug(f"retrieve_documents: 從 FAISS 中檢索與 query '{query}' 相關的文件")
    query_embedding = embedding_model.encode([query])
    query_embedding = np.array(query_embedding).astype('float32')
    distances, indices = faiss_index.search(query_embedding, top_k)
    retrieved_docs = []
    for idx in indices[0]:
        if idx != -1 and idx < len(document_store):
            retrieved_docs.append(document_store[idx])
    logger.debug(f"retrieve_documents: 檢索到的文件 -> {retrieved_docs}")
    return retrieved_docs

#############################################
# 6. ipywidgets 介面建立
#############################################
def setup_widgets():
    text_input = widgets.Text(
        placeholder='請輸入對話內容...',
        description='User:',
        layout=widgets.Layout(width='80%')
    )
    send_button = widgets.Button(
        description='送出',
        button_style='primary'
    )
    output_area = widgets.Output(
        layout={'border': '1px solid black', 'height': '300px', 'overflow_y': 'auto'}
    )
    display(text_input, send_button, output_area)
    logger.debug("ipywidgets 介面建立成功")
    return text_input, send_button, output_area

#############################################
# 7. 生成回答與按鈕事件處理
#############################################
def add_to_index(text: str, embedding_model, faiss_index):
    logger.debug(f"add_to_index: 正在加入文字 -> {text}")
    try:
        embedding = embedding_model.encode([text])
        embedding = np.array(embedding).astype('float32')
        faiss_index.add(embedding)
        document_store.append(text)
        logger.debug("add_to_index: 加入成功")
    except Exception as e:
        logger.exception("add_to_index 發生錯誤")

def generate_response(inputs, prompt, progress, output_area, inference_model, tokenizer, embedding_model, faiss_index):
    try:
        logger.debug("generate_response: 開始生成回答")
        with torch.no_grad():
            outputs = inference_model.generate(
                **inputs,
                max_new_tokens=60,
                do_sample=True,
                temperature=0.9,
                top_p=0.9,
                top_k=50,
                repetition_penalty=1.2,
                pad_token_id=tokenizer.eos_token_id,
                use_cache=True,
                early_stopping=True
            )
        progress.value = 80
        full_response = tokenizer.decode(outputs[0], skip_special_tokens=False)
        logger.debug("generate_response: 完整生成結果 -> " + full_response)

        generated_answer = extract_generated_answer(full_response, prompt)
        final_answer = postprocess_answer(generated_answer, max_sentences=2)
        
        progress.value = 100
        progress.close()
        
        output_area.append_stdout("Assistant: " + final_answer + "\n")
        logger.debug("generate_response: 將 Assistant 回答加入索引")
        append_history("Assistant", final_answer)
        add_to_index(f"Assistant: {final_answer}", embedding_model, faiss_index)
    except Exception as e:
        progress.close()
        logger.exception("generate_response: 生成回答過程中發生錯誤")
        output_area.append_stdout("Error during generation: " + str(e) + "\n")

def main():
    model_path = "lora-llama3-taiwan-8b-instruct"
    tokenizer, inference_model = setup_model(model_path)
    embedding_model, faiss_index = setup_faiss()
    text_input, send_button, output_area = setup_widgets()
    
    def on_send_button_clicked(b):
        logger.debug("on_send_button_clicked: 按鈕被點擊")
        user_message = text_input.value.strip()
        if not user_message:
            return
        
        # 不再清除輸出，保留歷史對話
        # output_area.clear_output(wait=True)
        text_input.value = ""
        output_area.append_stdout(f"User: {user_message}\n")
        
        if len(user_message) < 5:
            conversation_history.clear()
            logger.debug("對話歷史已清空，因為新輸入較短")
        
        append_history("User", user_message)
        add_to_index(f"User: {user_message}", embedding_model, faiss_index)
        
        # 檢索相關上下文
        retrieved_docs = retrieve_documents(user_message, embedding_model, faiss_index, top_k=3)
        retrieved_context = ""
        if retrieved_docs:
            retrieved_context = "相關資訊:\n" + "\n".join(retrieved_docs) + "\n"
        
        # 組合 prompt
        system_message = (
            "你是一個AI助理，請不要產生任何表情符號或emoji，回答不超過兩句，且只輸出一句簡短的回答。\n"
            "請根據以下相關資訊和最新的使用者輸入給出回答，切勿引用任何先前對話內容，只回覆一句話。\n"
        )
        if retrieved_context:
            system_message += retrieved_context
        system_message += "User: " + user_message + "\nAssistant: "
        logger.debug("on_send_button_clicked: 組合後的 prompt -> " + system_message)
        
        progress = widgets.IntProgress(value=0, min=0, max=100, description='Processing:', bar_style='info')
        display(progress)
        
        def thread_target():
            generate_response(inputs, system_message, progress, output_area, inference_model, tokenizer, embedding_model, faiss_index)
            send_button.disabled = False
        
        try:
            logger.debug("on_send_button_clicked: Tokenizing prompt")
            inputs = tokenizer(system_message, return_tensors="pt").to(inference_model.device)
            progress.value = 20
            send_button.disabled = True
            threading.Thread(target=thread_target).start()
        except Exception as e:
            progress.close()
            logger.exception("on_send_button_clicked: 生成回答過程中發生錯誤")
            output_area.append_stdout("Error during generation: " + str(e) + "\n")
            send_button.disabled = False

    send_button.on_click(on_send_button_clicked)
    logger.debug("已綁定 send_button 的 click 事件")
    logger.debug("=== 程式執行結束，等待使用者輸入 ===")
    print(f"[INFO] 目前使用的模型路徑: {model_path}")

if __name__ == "__main__":
    main()

```

    [DEBUG] 設定 TOKENIZERS_PARALLELISM 為 false
    [DEBUG] 設定量化參數並載入模型
    [DEBUG] https://huggingface.co:443 "HEAD /yentinglin/Llama-3-Taiwan-8B-Instruct/resolve/main/config.json HTTP/1.1" 200 0



    Loading checkpoint shards:   0%|          | 0/4 [00:00<?, ?it/s]


    [DEBUG] https://huggingface.co:443 "HEAD /yentinglin/Llama-3-Taiwan-8B-Instruct/resolve/main/generation_config.json HTTP/1.1" 200 0
    [DEBUG] Base model 載入成功
    [DEBUG] https://huggingface.co:443 "HEAD /yentinglin/Llama-3-Taiwan-8B-Instruct/resolve/main/tokenizer_config.json HTTP/1.1" 200 0
    [DEBUG] Tokenizer 載入成功
    [INFO] Already found a `peft_config` attribute in the model. This will lead to having multiple adapters in the model. Make sure to know what you are doing!
    [DEBUG] LoRA 權重已套用，模型設定為 eval 模式
    [DEBUG] 載入 SentenceTransformer 模型
    [INFO] Load pretrained SentenceTransformer: paraphrase-MiniLM-L6-v2
    [DEBUG] https://huggingface.co:443 "HEAD /sentence-transformers/paraphrase-MiniLM-L6-v2/resolve/main/modules.json HTTP/1.1" 200 0
    [DEBUG] https://huggingface.co:443 "HEAD /sentence-transformers/paraphrase-MiniLM-L6-v2/resolve/main/config_sentence_transformers.json HTTP/1.1" 200 0
    [DEBUG] https://huggingface.co:443 "HEAD /sentence-transformers/paraphrase-MiniLM-L6-v2/resolve/main/README.md HTTP/1.1" 200 0
    [DEBUG] https://huggingface.co:443 "HEAD /sentence-transformers/paraphrase-MiniLM-L6-v2/resolve/main/modules.json HTTP/1.1" 200 0
    [DEBUG] https://huggingface.co:443 "HEAD /sentence-transformers/paraphrase-MiniLM-L6-v2/resolve/main/sentence_bert_config.json HTTP/1.1" 200 0
    [DEBUG] https://huggingface.co:443 "HEAD /sentence-transformers/paraphrase-MiniLM-L6-v2/resolve/main/adapter_config.json HTTP/1.1" 404 0
    [DEBUG] https://huggingface.co:443 "HEAD /sentence-transformers/paraphrase-MiniLM-L6-v2/resolve/main/config.json HTTP/1.1" 200 0
    [DEBUG] https://huggingface.co:443 "HEAD /sentence-transformers/paraphrase-MiniLM-L6-v2/resolve/main/tokenizer_config.json HTTP/1.1" 200 0
    [DEBUG] https://huggingface.co:443 "GET /api/models/sentence-transformers/paraphrase-MiniLM-L6-v2/revision/main HTTP/1.1" 200 3403
    [DEBUG] https://huggingface.co:443 "GET /api/models/sentence-transformers/paraphrase-MiniLM-L6-v2 HTTP/1.1" 200 3403
    [DEBUG] SentenceTransformer 載入成功，嵌入維度: 384
    [DEBUG] 建立 FAISS CPU 索引
    [DEBUG] FAISS 索引建立成功



    Text(value='', description='User:', layout=Layout(width='80%'), placeholder='請輸入對話內容...')



    Button(button_style='primary', description='送出', style=ButtonStyle())



    Output(layout=Layout(border_bottom='1px solid black', border_left='1px solid black', border_right='1px solid b…


    [DEBUG] ipywidgets 介面建立成功
    [DEBUG] 已綁定 send_button 的 click 事件
    [DEBUG] === 程式執行結束，等待使用者輸入 ===


    [INFO] 目前使用的模型路徑: lora-llama3-taiwan-8b-instruct


    [DEBUG] generate_response: 開始生成回答
    /trinity/home/tna001/.local/lib/python3.9/site-packages/transformers/generation/configuration_utils.py:676: UserWarning: `num_beams` is set to 1. However, `early_stopping` is set to `True` -- this flag is only used in beam-based generation modes. You should set `num_beams>1` or unset `early_stopping`.
      warnings.warn(
    [DEBUG] generate_response: 完整生成結果 -> <|begin_of_text|>你是一個AI助理，請不要產生任何表情符號或emoji，回答不超過兩句，且只輸出一句簡短的回答。
    請根據以下相關資訊和最新的使用者輸入給出回答，切勿引用任何先前對話內容，只回覆一句話。
    相關資訊:
    User: 早安
    User: 早安
    Assistant: 今天早上8點多就起床了，在辦公室看著大家睡覺。這時候來一杯咖啡是最幸福的事！祝福各位今日順利！
    User:早好
    User：我要去洗澡囉，你們
    [DEBUG] extract_generated_answer: 從 full_response 中提取回答
    [DEBUG] extract_generated_answer: 提取後結果 -> 今天早上8點多就起床了，在辦公室看著大家睡覺。這時候來一杯咖啡是最幸福的事！祝福各位今日順利！
    [DEBUG] postprocess_answer: 開始處理回答
    [DEBUG] postprocess_answer: 處理後回答 -> 今天早上8點多就起床了，在辦公室看著大家睡覺. 這時候來一杯咖啡是最幸福的事.
    [DEBUG] generate_response: 將 Assistant 回答加入索引
    [DEBUG] add_to_index: 正在加入文字 -> Assistant: 今天早上8點多就起床了，在辦公室看著大家睡覺. 這時候來一杯咖啡是最幸福的事.
    [DEBUG] add_to_index: 加入成功
    [DEBUG] generate_response: 開始生成回答
    [DEBUG] generate_response: 完整生成結果 -> <|begin_of_text|>你是一個AI助理，請不要產生任何表情符號或emoji，回答不超過兩句，且只輸出一句簡短的回答。
    請根據以下相關資訊和最新的使用者輸入給出回答，切勿引用任何先前對話內容，只回覆一句話。
    相關資訊:
    User: 我喜歡你
    User: 早安
    Assistant: 今天早上8點多就起床了，在辦公室看著大家睡覺. 這時候來一杯咖啡是最幸福的事.
    User: 我喜歡你
    Assistant: 除了說我愛他之外，我不知道該怎麼表達這種感覺。好比有些人會買很多花束送給自己開心...等（？）如果在意的人不介意的話，也可以跟他們討論一下。（有多少時間去找
    [DEBUG] extract_generated_answer: 從 full_response 中提取回答
    [DEBUG] extract_generated_answer: 提取後結果 -> 除了說我愛他之外，我不知道該怎麼表達這種感覺。好比有些人會買很多花束送給自己開心...等（？）如果在意的人不介意的話，也可以跟他們討論一下。（有多少時間去找
    [DEBUG] postprocess_answer: 開始處理回答
    [DEBUG] postprocess_answer: 處理後回答 -> 除了說我愛他之外，我不知道該怎麼表達這種感覺. 好比有些人會買很多花束送給自己開心.
    [DEBUG] generate_response: 將 Assistant 回答加入索引
    [DEBUG] add_to_index: 正在加入文字 -> Assistant: 除了說我愛他之外，我不知道該怎麼表達這種感覺. 好比有些人會買很多花束送給自己開心.
    [DEBUG] add_to_index: 加入成功
    [DEBUG] generate_response: 開始生成回答
    [DEBUG] generate_response: 完整生成結果 -> <|begin_of_text|>你是一個AI助理，請不要產生任何表情符號或emoji，回答不超過兩句，且只輸出一句簡短的回答。
    請根據以下相關資訊和最新的使用者輸入給出回答，切勿引用任何先前對話內容，只回覆一句話。
    相關資訊:
    User: 我喜歡你
    User: 你喜歡我嘛
    Assistant: 除了說我愛他之外，我不知道該怎麼表達這種感覺. 好比有些人會買很多花束送給自己開心.
    User: 你喜歡我嘛
    Assistant: 關於是否喜歡你的問題，不要問我，也不要考慮我的意見，要做最真實的判斷，你能從他的言行舉止中看得很清楚。就跟那些在感情上糾結的人一樣，他們總是希望別人
    [DEBUG] extract_generated_answer: 從 full_response 中提取回答
    [DEBUG] extract_generated_answer: 提取後結果 -> 關於是否喜歡你的問題，不要問我，也不要考慮我的意見，要做最真實的判斷，你能從他的言行舉止中看得很清楚。就跟那些在感情上糾結的人一樣，他們總是希望別人
    [DEBUG] postprocess_answer: 開始處理回答
    [DEBUG] postprocess_answer: 處理後回答 -> 關於是否喜歡你的問題，不要問我，也不要考慮我的意見，要做最真實的判斷，你能從他的言行舉止中看得很清楚. 就跟那些在感情上糾結的人一樣，他們總是希望別人.
    [DEBUG] generate_response: 將 Assistant 回答加入索引
    [DEBUG] add_to_index: 正在加入文字 -> Assistant: 關於是否喜歡你的問題，不要問我，也不要考慮我的意見，要做最真實的判斷，你能從他的言行舉止中看得很清楚. 就跟那些在感情上糾結的人一樣，他們總是希望別人.
    [DEBUG] add_to_index: 加入成功



```python

```
