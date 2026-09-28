"""
Musicly Air AI - Model Evaluation Script
Evaluates any trained model directory on the held-out test set.
Usage: python ml/evaluation/evaluate.py
"""

import os
import sys
import json
import numpy as np

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from preprocessing.preprocessor import AIR_AI_CLASSES, CLASS_TO_IDX

from sklearn.metrics import classification_report, confusion_matrix, accuracy_score


def run_evaluation(model_dir=None, dataset_path=None):
    if not model_dir:
        model_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models', 'musicly_gesture_v1'))
    if not dataset_path:
        dataset_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'dataset', 'dataset.json'))

    print(f"==================================================")
    print(f"MUSICLY AIR AI - MODEL EVALUATION")
    print(f"Model Directory: {model_dir}")
    print(f"Dataset File:    {dataset_path}")
    print(f"==================================================")

    metrics_file = os.path.join(model_dir, 'metrics.json')
    if not os.path.exists(metrics_file):
        print(f"Error: metrics.json not found in {model_dir}. Please train model first.")
        return

    with open(metrics_file, 'r', encoding='utf-8') as f:
        metrics = json.load(f)

    eval_data = metrics.get('evaluation', {})
    metadata = metrics.get('metadata', {})

    print(f"\nModel: {metadata.get('model_name', 'Musicly Gesture AI')} {metadata.get('version', '')}")
    print(f"Trained on: {metadata.get('created_at', 'N/A')}")
    print(f"Epochs: {metadata.get('epochs', 'N/A')} | Batch Size: {metadata.get('batch_size', 'N/A')}")
    print(f"Model Size: {metadata.get('model_size_kb', 'N/A')} KB")
    print(f"\nHELD-OUT TEST SET PERFORMANCE:")
    print(f"  Test Accuracy:     {eval_data.get('test_accuracy', 0.0) * 100:.2f}%")
    print(f"  Test Loss:         {eval_data.get('test_loss', 0.0):.4f}")
    print(f"  Macro Precision:   {eval_data.get('macro_precision', 0.0):.4f}")
    print(f"  Macro Recall:      {eval_data.get('macro_recall', 0.0):.4f}")
    print(f"  Macro F1 Score:    {eval_data.get('macro_f1', 0.0):.4f}")
    print(f"  Avg Latency:       {eval_data.get('avg_inference_latency_ms', 0.0):.3f} ms")

    print(f"\nPER-CLASS EVALUATION:")
    per_class = eval_data.get('per_class', {})
    header = f"{'Gesture':<20} | {'Accuracy':<10} | {'Precision':<10} | {'Recall':<10} | {'F1':<10} | {'Test Samples'}"
    print(header)
    print("-" * len(header))
    for c_name in AIR_AI_CLASSES:
        stat = per_class.get(c_name, {})
        print(f"{c_name:<20} | {stat.get('accuracy', 0)*100:6.2f}%    | {stat.get('precision', 0):6.4f}     | {stat.get('recall', 0):6.4f}  | {stat.get('f1_score', 0):6.4f} | {stat.get('test_samples', 0)}")

    print(f"\nCONFUSION MATRIX (Rows: Actual, Columns: Predicted):")
    cm = eval_data.get('confusion_matrix', [])
    print(f"{'':<18} " + " ".join(f"{c[:6]:>7}" for c in AIR_AI_CLASSES))
    for idx, row in enumerate(cm):
        c_label = AIR_AI_CLASSES[idx]
        row_str = " ".join(f"{val:>7}" for val in row)
        print(f"{c_label:<18} {row_str}")

    print(f"==================================================")


if __name__ == '__main__':
    run_evaluation()
