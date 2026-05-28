use pith_core::{evaluate_records, FeedbackRecord, PithEngine};

#[test]
fn eval_metrics_should_compute_scores() {
    let engine = PithEngine::new();
    let records = vec![
        FeedbackRecord {
            input: "Refactor backend retry flow and keep idempotency".to_string(),
            expected_contains: vec!["retry".to_string()],
            mode: Some("query".to_string()),
        },
        FeedbackRecord {
            input: "Generate JSON output for this migration plan".to_string(),
            expected_contains: vec!["json".to_string()],
            mode: Some("query".to_string()),
        },
    ];

    let report = evaluate_records(&engine, &records);
    assert_eq!(report.total, 2);
    assert!(report.contains_score >= 0.0 && report.contains_score <= 1.0);
    assert!(report.avg_compression_ratio >= 0.0);
}
