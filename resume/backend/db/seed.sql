INSERT INTO users (username, email, role) VALUES
  ('zhangsan', 'zhangsan@example.com', 'student'),
  ('lisi', 'lisi@example.com', 'student');

INSERT INTO job_posts (title, industry, description) VALUES
  ('前端开发工程师', '互联网', '熟悉 Angular、TypeScript、REST API；有组件化与状态管理经验。'),
  ('Java 后端工程师', '软件', '熟悉 Spring Boot、MySQL、微服务；有高并发项目经验。');

INSERT INTO resume_files (user_id, file_name, mime_type, extracted_text) VALUES
  (1, 'demo_resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', '示例简历：负责校园项目前端开发，使用 Angular 完成模块化重构。');

INSERT INTO analyses (resume_id, job_id, structure_score, expression_score, quant_score, match_score, result_json) VALUES
  (1, 1, 78, 72, 65, 81, '{"diagnosis":{"structureScore":78},"matching":{"matchScore":81}}');

INSERT INTO keywords (analysis_id, keyword, match_type) VALUES
  (1, 'Angular', 'matched'),
  (1, 'TypeScript', 'matched'),
  (1, 'Spring Boot', 'missing');
