from apps.eval.run_eval import (
    THRESHOLDS,
    calculate_metrics,
    load_dataset,
    print_results_table,
)


def test_load_regression_dataset() -> None:
    """Verify regression dataset loads at least 20 question-answer pairs."""
    dataset = load_dataset("regression")
    assert len(dataset) >= 20
    first_item = dataset[0]
    assert "question" in first_item
    assert "ground_truth_answer" in first_item
    assert "expected_file_paths" in first_item
    assert "expected_keywords" in first_item


def test_calculate_metrics_and_thresholds() -> None:
    """Verify evaluation metric calculations pass all minimum quality thresholds."""
    dataset = load_dataset("regression")
    eval_data = []
    for item in dataset:
        contexts = [
            f"# {f}\n{item['ground_truth_answer']}"
            for f in item["expected_file_paths"]
        ]
        eval_data.append(
            {
                "question": item["question"],
                "answer": item["ground_truth_answer"],
                "contexts": contexts,
                "ground_truth": item["ground_truth_answer"],
                "expected_keywords": item["expected_keywords"],
            }
        )

    scores = calculate_metrics(eval_data)
    assert scores["faithfulness"] >= THRESHOLDS["faithfulness"]
    assert scores["answer_relevancy"] >= THRESHOLDS["answer_relevancy"]
    assert scores["context_recall"] >= THRESHOLDS["context_recall"]
    assert scores["context_precision"] >= THRESHOLDS["context_precision"]

    passed = print_results_table(scores)
    assert passed is True
