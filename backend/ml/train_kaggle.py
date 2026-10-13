"""
================================================================================
KisanDrishti - MobileNetV3 Agronomic Disease Training Script (Kaggle Edition)
================================================================================
Designed to run on Kaggle with free GPU (T4 x2 or P100).
Trains a 38-class Plant Pathology CNN using MobileNetV3-Large Transfer Learning.

Outputs:
  - kisan_drishti_model.pt       (Trained PyTorch weights - ~15 MB)
  - training_performance.png     (Loss and Accuracy curves for your report)
  - confusion_matrix.png         (High-resolution confusion matrix for professor)
  - classification_report.txt    (Precision, Recall, F1 per class)

Instructions:
  1. Open Kaggle.com -> Click "+ Create" -> "New Notebook"
  2. Right Sidebar -> "Notebook options" -> "Accelerator" -> Choose "GPU T4 x2"
  3. Right Sidebar -> "Data" -> Click "+ Add Input" -> Search "PlantVillage"
     (Any PlantVillage dataset with color images works; e.g. abdallahalidev/plantvillage-dataset)
  4. Copy & Paste this entire code into a cell and click "Run All" (or Shift+Enter)
  5. Once finished (~10-12 mins), download 'kisan_drishti_model.pt' from Output tab.
================================================================================
"""

import os
import sys
import glob
import time
import copy
import pathlib
import numpy as np
import matplotlib.pyplot as plt

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, random_split
from torchvision import datasets, transforms, models

try:
    from sklearn.metrics import classification_report, confusion_matrix
    import seaborn as sns
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
BATCH_SIZE = 64
NUM_EPOCHS = 10
LEARNING_RATE = 1e-3
NUM_CLASSES = 38
RANDOM_SEED = 42

torch.manual_seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
print(f"[*] Using Computing Device: {DEVICE}")
if DEVICE.type == "cuda":
    print(f"[*] GPU Name: {torch.cuda.get_device_name(0)}")

# -----------------------------------------------------------------------------
# 1. Automatic Dataset Discovery (Finds PlantVillage anywhere in /kaggle/input/)
# -----------------------------------------------------------------------------
def find_plantvillage_dir():
    search_roots = ["/kaggle/input", "./data", "./PlantVillage", "."]
    candidates = []

    for root in search_roots:
        if not os.path.exists(root):
            continue
        for dirpath, dirnames, _ in os.walk(root):
            # Check if this folder contains ~38 subfolders (like Tomato___Late_blight)
            subdirs = [d for d in dirnames if "___" in d]
            if len(subdirs) >= 30:
                candidates.append(dirpath)

    if not candidates:
        print("\n[!] Could not automatically find the 38-class PlantVillage folder.")
        if os.path.exists("/kaggle/input"):
            print(f"[*] Current contents in /kaggle/input: {os.listdir('/kaggle/input')}")
        print("[!] Searching for any subfolder with 'color' or 'PlantVillage'...")
        fallback = glob.glob("/kaggle/input/**/color", recursive=True)
        if fallback:
            return fallback[0]
        fallback_pv = glob.glob("/kaggle/input/**/PlantVillage*", recursive=True)
        if fallback_pv:
            for p in fallback_pv:
                if os.path.isdir(p):
                    return p
        raise FileNotFoundError(
            "Please ensure you added a PlantVillage DATASET (not a Notebook) in the Kaggle sidebar (+ Add Input)."
        )

    # Prefer folder named 'color' if available
    for c in candidates:
        if "color" in c.lower() and "segmented" not in c.lower():
            return c
    return candidates[0]

data_dir = find_plantvillage_dir()
print(f"[+] Found PlantVillage Dataset at: {data_dir}")

# -----------------------------------------------------------------------------
# 2. Data Transforms with Augmentation
# -----------------------------------------------------------------------------
train_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.RandomHorizontalFlip(p=0.5),
    transforms.RandomVerticalFlip(p=0.3),
    transforms.RandomRotation(degrees=20),
    transforms.ColorJitter(brightness=0.15, contrast=0.15, saturation=0.15),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

val_transforms = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

full_dataset = datasets.ImageFolder(data_dir, transform=train_transforms)
class_names = full_dataset.classes
print(f"[+] Detected {len(class_names)} classes.")

# 80% Train, 20% Validation split
val_size = int(0.20 * len(full_dataset))
train_size = len(full_dataset) - val_size
train_data, val_data = random_split(
    full_dataset, 
    [train_size, val_size],
    generator=torch.Generator().manual_seed(RANDOM_SEED)
)

# Apply non-augmented transforms to validation set
val_data.dataset = copy.deepcopy(full_dataset)
val_data.dataset.transform = val_transforms

train_loader = DataLoader(train_data, batch_size=BATCH_SIZE, shuffle=True, num_workers=2, pin_memory=True)
val_loader = DataLoader(val_data, batch_size=BATCH_SIZE, shuffle=False, num_workers=2, pin_memory=True)

print(f"[+] Total Images: {len(full_dataset)} (Train: {len(train_data)}, Val: {len(val_data)})")

# -----------------------------------------------------------------------------
# 3. Model Architecture: MobileNetV3-Large with Custom Classification Head
# -----------------------------------------------------------------------------
def build_kisandrishti_model(num_classes=38):
    print("[+] Loading MobileNetV3-Large pretrained on ImageNet...")
    model = models.mobilenet_v3_large(weights=models.MobileNet_V3_Large_Weights.DEFAULT)
    
    # Freeze lower feature extractor layers initially
    for param in model.features[:-4].parameters():
        param.requires_grad = False

    # MobileNetV3 classifier: [0: Linear(960, 1280), 1: Hardswish, 2: Dropout(0.2), 3: Linear(1280, 1000)]
    # Replace the final linear projection (layer 3) to output num_classes
    in_features = model.classifier[3].in_features
    model.classifier[2] = nn.Dropout(p=0.3)
    model.classifier[3] = nn.Linear(in_features, num_classes)
    return model

model = build_kisandrishti_model(num_classes=len(class_names))
model = model.to(DEVICE)

criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(filter(lambda p: p.requires_grad, model.parameters()), lr=LEARNING_RATE, weight_decay=1e-4)
scheduler = optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=NUM_EPOCHS, eta_min=1e-5)

# -----------------------------------------------------------------------------
# 4. Training Loop
# -----------------------------------------------------------------------------
history = {
    "train_loss": [],
    "train_acc": [],
    "val_loss": [],
    "val_acc": [],
}

best_val_acc = 0.0
best_model_weights = copy.deepcopy(model.state_dict())

print("\n" + "="*70)
print(f"  Starting KisanDrishti-VisionNet Training for {NUM_EPOCHS} Epochs")
print("="*70)

t_start = time.time()

for epoch in range(1, NUM_EPOCHS + 1):
    epoch_start = time.time()
    
    # --- Training Phase ---
    model.train()
    running_loss, running_corrects = 0.0, 0
    
    for inputs, labels in train_loader:
        inputs = inputs.to(DEVICE, non_blocking=True)
        labels = labels.to(DEVICE, non_blocking=True)

        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()

        _, preds = torch.max(outputs, 1)
        running_loss += loss.item() * inputs.size(0)
        running_corrects += torch.sum(preds == labels.data).item()

    scheduler.step()
    epoch_train_loss = running_loss / len(train_data)
    epoch_train_acc = running_corrects / len(train_data)

    # --- Validation Phase ---
    model.eval()
    val_loss, val_corrects = 0.0, 0

    with torch.no_grad():
        for inputs, labels in val_loader:
            inputs = inputs.to(DEVICE, non_blocking=True)
            labels = labels.to(DEVICE, non_blocking=True)

            outputs = model(inputs)
            loss = criterion(outputs, labels)

            _, preds = torch.max(outputs, 1)
            val_loss += loss.item() * inputs.size(0)
            val_corrects += torch.sum(preds == labels.data).item()

    epoch_val_loss = val_loss / len(val_data)
    epoch_val_acc = val_corrects / len(val_data)
    elapsed = time.time() - epoch_start

    history["train_loss"].append(epoch_train_loss)
    history["train_acc"].append(epoch_train_acc)
    history["val_loss"].append(epoch_val_loss)
    history["val_acc"].append(epoch_val_acc)

    print(
        f"Epoch [{epoch:02d}/{NUM_EPOCHS:02d}] ({elapsed:.1f}s) | "
        f"Train Loss: {epoch_train_loss:.4f} Acc: {epoch_train_acc*100:.2f}% | "
        f"Val Loss: {epoch_val_loss:.4f} Acc: {epoch_val_acc*100:.2f}%"
    )

    if epoch_val_acc > best_val_acc:
        best_val_acc = epoch_val_acc
        best_model_weights = copy.deepcopy(model.state_dict())
        print(f"  --> Saved new best validation accuracy: {best_val_acc*100:.2f}%")

total_time = (time.time() - t_start) / 60
print("\n" + "="*70)
print(f"Training Complete in {total_time:.1f} minutes! Best Validation Acc: {best_val_acc*100:.2f}%")
print("="*70)

# Load best weights
model.load_state_dict(best_model_weights)

# -----------------------------------------------------------------------------
# 5. Save Final PyTorch Weights
# -----------------------------------------------------------------------------
output_weights_path = "kisan_drishti_model.pt"
clean_state = {k: v.cpu() for k, v in best_model_weights.items()}
torch.save(clean_state, output_weights_path)
file_size_mb = os.path.getsize(output_weights_path) / (1024 * 1024)
print(f"\n[✓] PyTorch Weights Successfully Saved: {output_weights_path} ({file_size_mb:.2f} MB)")

# -----------------------------------------------------------------------------
# 6. Generate Training Curves Graph (For your Academic Report / Slides)
# -----------------------------------------------------------------------------
epochs_range = range(1, NUM_EPOCHS + 1)
plt.figure(figsize=(12, 5))

plt.subplot(1, 2, 1)
plt.plot(epochs_range, history["train_loss"], "o-", label="Train Loss", color="#d9534f")
plt.plot(epochs_range, history["val_loss"], "s-", label="Val Loss", color="#0275d8")
plt.title("KisanDrishti Training & Validation Loss")
plt.xlabel("Epoch")
plt.ylabel("Cross-Entropy Loss")
plt.grid(True, linestyle="--", alpha=0.5)
plt.legend()

plt.subplot(1, 2, 2)
plt.plot(epochs_range, [a * 100 for a in history["train_acc"]], "o-", label="Train Acc", color="#5cb85c")
plt.plot(epochs_range, [a * 100 for a in history["val_acc"]], "s-", label="Val Acc", color="#f0ad4e")
plt.title(f"Accuracy Progression (Peak: {best_val_acc*100:.2f}%)")
plt.xlabel("Epoch")
plt.ylabel("Accuracy (%)")
plt.grid(True, linestyle="--", alpha=0.5)
plt.legend()

plt.tight_layout()
plt.savefig("training_performance.png", dpi=200)
print("[✓] Saved training performance plot: training_performance.png")

# -----------------------------------------------------------------------------
# 7. Generate Confusion Matrix & Classification Report
# -----------------------------------------------------------------------------
print("\n[*] Evaluating on Validation Set for Detailed Agronomic Report...")
y_true, y_pred = [], []
model.eval()

with torch.no_grad():
    for inputs, labels in val_loader:
        inputs = inputs.to(DEVICE)
        outputs = model(inputs)
        _, preds = torch.max(outputs, 1)
        y_true.extend(labels.cpu().numpy())
        y_pred.extend(preds.cpu().numpy())

if HAS_SKLEARN:
    report = classification_report(y_true, y_pred, target_names=class_names, digits=4)
    with open("classification_report.txt", "w") as f:
        f.write(report)
    print("[✓] Saved classification report: classification_report.txt")

    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(16, 14))
    sns.heatmap(cm, annot=False, cmap="Greens", fmt="d", xticklabels=class_names, yticklabels=class_names)
    plt.title(f"KisanDrishti Confusion Matrix (Accuracy: {best_val_acc*100:.2f}%)")
    plt.xlabel("Predicted Disease")
    plt.ylabel("True Disease")
    plt.xticks(rotation=90, fontsize=7)
    plt.yticks(fontsize=7)
    plt.tight_layout()
    plt.savefig("confusion_matrix.png", dpi=200)
    print("[✓] Saved Confusion Matrix heatmap: confusion_matrix.png")

print("\n" + "="*70)
print("  ALL ARTIFACTS READY FOR DOWNLOAD:")
print("  1. kisan_drishti_model.pt     <-- Download and drop into backend/ml/")
print("  2. training_performance.png   <-- Use in your presentation/project report")
print("  3. confusion_matrix.png       <-- Teacher / professor evaluation evidence")
print("  4. classification_report.txt  <-- Precision / Recall scores")
print("="*70)
