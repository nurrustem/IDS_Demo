def score_alert(severity: int) -> float:
    return min(severity * 10.0, 100.0)