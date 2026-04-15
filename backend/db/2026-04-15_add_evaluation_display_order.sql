ALTER TABLE evaluation
  ADD COLUMN display_order INT NOT NULL DEFAULT 0 AFTER number;

CREATE INDEX idx_evaluation_course_cycle_display_order
  ON evaluation(course_cycle_id, display_order, start_date, number, id);

UPDATE evaluation target
JOIN (
  SELECT
    e.id,
    CASE
      WHEN UPPER(TRIM(et.code)) = 'BANCO_ENUNCIADOS' THEN 0
      ELSE SUM(
        CASE
          WHEN UPPER(TRIM(et.code)) = 'BANCO_ENUNCIADOS' THEN 0
          ELSE 1
        END
      ) OVER (
        PARTITION BY e.course_cycle_id
        ORDER BY e.start_date ASC, e.number ASC, e.id ASC
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
      )
    END AS next_display_order
  FROM evaluation e
  INNER JOIN evaluation_type et ON et.id = e.evaluation_type_id
) ordered ON ordered.id = target.id
SET target.display_order = ordered.next_display_order;
