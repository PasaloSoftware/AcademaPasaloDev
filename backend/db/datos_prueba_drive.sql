-- Script generado automaticamente desde BD local
-- Replica estado Drive (scopes, videos, folders y materiales)
USE academia_pasalo;

SET @active_cycle_id = (
  SELECT COALESCE((SELECT CAST(setting_value AS UNSIGNED) FROM system_setting WHERE setting_key='ACTIVE_CYCLE_ID' LIMIT 1), (SELECT id FROM academic_cycle ORDER BY id DESC LIMIT 1))
);
SET @folder_status_active = (SELECT id FROM folder_status WHERE code = 'ACTIVE' LIMIT 1);
SET @material_status_active = (SELECT id FROM material_status WHERE code = 'ACTIVE' LIMIT 1);
SET @recording_ready = (SELECT id FROM class_event_recording_status WHERE code = 'READY' LIMIT 1);
SET @actor_user_id = 1;

-- 1) Scopes Drive por evaluacion (ciclo activo)
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 17, 'ev_17', '1NF87WUWPeu8MBL4t03DPdbWksOQjuqSl', '1DgjDz0ZrnxjgAFj2ULLqiL_GTx9Zig78', '1bH8tcGJKu4uFgvtJ9099l1-b0gLLXMZi', '1NYvVjfALq1IfjyYT-o_xSM4djL0fleRo', 'ev-17-viewers@academiapasalo.com', '00upglbi2al8x8k', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 17);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 18, 'ev_18', '1Vqmx_oiQKF3D9AhH-NnPRQ0cICrV0jDY', '11NUTMF8c8rB5EPNlq8DbrIuHXWKRmbcG', '1Ex8L8jVmSC1wWkhxM9E4EUppHMbTzRjK', '1iUl9WNXNakkK58gOl7K4CmQOBF6UPkI5', 'ev-18-viewers@academiapasalo.com', '035nkun20jntf4r', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 18);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 19, 'ev_19', '1q7BjCKNDMku-G2jqy0WW-PRJiOBXYa_2', '1m_sS1JPdBo4NEvHclt2pyKlF3FTlB05R', '1egkKVyxKzBr4L2_3KIoCOBXS6b3G2s9L', '1OdZHMsiFQXb-IkuqTsDsV4V6UJVWb0PF', 'ev-19-viewers@academiapasalo.com', '00sqyw641qbosxy', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 19);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 20, 'ev_20', '1bnUvHGHSqtoXJP8v3dFX7ULnvKGf1bRL', '16NWpcdqsGi2PQ5NdWF8KFZQs6QNUarl8', '1BAVCNHyo4QQ1g_2MIAv9Aro0nfBXjFEY', '18vl5AnAsDMwRBPpAW6KBqqFzIl9Rbcny', 'ev-20-viewers@academiapasalo.com', '045jfvxd0nf2kb8', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 20);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 37, 'ev_37', '1JmdZwGuZNDYAVMCslMm_Ily9hzDQaumm', '1qAwy_zifjT-x0sTH8FDfnxGIH6gMDfV1', '1NiCeNfjGTaLJZo6E7PSPLf2uRvfR6FgQ', '1bnxvI9G38-ILFAWCAD-nQDvXxi_C3ZUL', 'ev-37-viewers@academiapasalo.com', '04d34og80v2tm4u', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 37);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 38, 'ev_38', '1x_Jhaf5QDRD2C-dicRGrKCUU14dusy7e', '11BczBDwozWpCXvK3oJTKKHm6ql-h7oQV', '1oqCiriOxmFRu3tzGDf96b6ZtjD9vHQwD', '1CoMARrPjrQjfnokSSx7wHcSBSRiDe5pm', 'ev-38-viewers@academiapasalo.com', '02p2csry46fytig', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 38);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 39, 'ev_39', '1N4T21YFB5O1-Aue__SrUQJPrkx301iow', '1HmY5Ev7aHBeoxWui_PCVY9acZKpcpghF', '1TMEhuJca0npRAU9eKmiXDflSVOpIcQ8q', '1JneoHhZrnOIQT6TvETOYyACgjvJ22acr', 'ev-39-viewers@academiapasalo.com', '01302m920rj3ssl', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 39);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 40, 'ev_40', '1Hm08BYCow8RT1b7c53OGR7-pSPGoK84u', '1PaXal7cqPd5Bxw-cCVcskpXM1olxtZWB', '1rVy8JUdRB0rqfXC3MQbSYJ7UuoG5txzj', '1Dk8jH8MS6XP6sZprpMyUkJ5y1VgGag3U', 'ev-40-viewers@academiapasalo.com', '01d96cc01iry76p', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 40);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 57, 'ev_57', '1Hk8t_eZPA5qf6d_fWnnPMCptj2BHGNDA', '1d3_MdWb2b2VO_-HtLmZT5Ig39CbiZXZC', '1jjYxWFYtatDvhMVZQhmSRRg49bT4N8uT', '1nbeg90phDQIji1m82sqo9wktKIOBGdky', 'ev-57-viewers@academiapasalo.com', '028h4qwu37o7lyv', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 57);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 58, 'ev_58', '1qWPoueS-ptqBw8a_F1kCdjWbIY2QkNW_', '18fDhoopdz9OSnXCnySnZA9sbmzktzM0o', '1t3D_BI4PyNgLTh9ePgOsgaUi1J0Am7MG', '18V8uYBTpsjDCFWcpAyMT3WzQCCWYM2GW', 'ev-58-viewers@academiapasalo.com', '00haapch24zcg39', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 58);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 59, 'ev_59', '1Rk8eH2Yelsn6YJChP6pn1ewpNeoczHFa', '1C1k3MfIbMZkAJCOdjaDcs2o8wLu9BUA_', '1KiWNslZjZYYLeSlY5WEYMi7zf3RqCleg', '167WDUCBJwjQx7qu-Lvc0CTEiWy4wQ7AI', 'ev-59-viewers@academiapasalo.com', '03jtnz0s3ee59m2', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 59);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 60, 'ev_60', '11BXJ5ZKVFSR4sPTjHjp11ZUEsC84o4gE', '1QdDrYVp8r7Ovnzd52sNb11gqpaI1hOH-', '1gsW7EbL35r1jkh64qXZW3HQi-hAqmp1e', '1blKCveBLNyJd7o9BdHU2DNiN6AOCGI_W', 'ev-60-viewers@academiapasalo.com', '01ksv4uv3on7k80', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 60);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 77, 'ev_77', '1zifWFKSxDeuIzJj1aeMK3ZDT0BmPXcgY', '1-kb6hSSwom-YrG9IJAvx6iZMnm6MRJUM', '1_7riLKuS5aew4HNlS9lvEOmzgi6LdjTy', '1n0H4df7nYJ5O2D2X6vEvvAfcDyAhQnar', 'ev-77-viewers@academiapasalo.com', '02250f4o1ek8hkh', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 77);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 78, 'ev_78', '1nqc4Ere-3nIR6MLrQTxGSvhCYcbB0y2P', '1xy-WOl6BpNZm9EbIF5jWaWjrxzCTF_zl', '1IrCSm1KR5BIFX8owpQKkAYqPRwJqWEn1', '1ZDYaqq7wE1vBmIOx4LszLNvVvcv5RdBB', 'ev-78-viewers@academiapasalo.com', '00nmf14n2t83553', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 78);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 79, 'ev_79', '1l8U-2sV9hHFxJHlXPzHx7Bwdt4W2iUzW', '1igYoahXJhsJMfxL4bCO4F4OefP5nm3wk', '15upwWLXN6qyW1XJSafLlMLybogCIqx4_', '1Qlr40M43ZEUjgoVeu7vgaRzNG2PfatrE', 'ev-79-viewers@academiapasalo.com', '0279ka651r0r0f7', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 79);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 80, 'ev_80', '1rQ3tWX4AfQuFsOVxvJI_aYYAhul6HEyj', '180wVhPGs8RTOKTPMz0OtpeAv2FPB5Vhn', '1iSA8EzeAQ2dtfQcs-1LdGdu2cpdxe0r2', '1sOKF1Rp6sMGj1YWZ_UzHYqtZzHVrT_J5', 'ev-80-viewers@academiapasalo.com', '01jlao461qb1hkf', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 80);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 97, 'ev_97', '11548eGr8VpAyrEf3C13tqJ1de0VuXTcl', '1VcfU0NTUI9W2_iQ_DK4YKoKzBOTILl4Y', '1oj6JPxN-pY_xoysLT8uq8sF_9fsgvsOf', '1U3a7ZGu0e8t69Zct9jt2n0s05nGDKmlP', 'ev-97-viewers@academiapasalo.com', '025b2l0r0sfe438', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 97);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 98, 'ev_98', '14i7g3vNUPq8rE1Z4BntbABpSmMzmR8fA', '17tDtvnKJI56Kf5lTNtc8hvytZo8ITC22', '1VWZZiMqRw7bsHGNxsVNWOmVbFsVjPkEE', '1XsUfhWhdM_ih58nb6sgmTW-62rJkf_7o', 'ev-98-viewers@academiapasalo.com', '01ljsd9k3csded4', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 98);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 99, 'ev_99', '1r-USJAB7RAo-ikSw44EnZ_kX5SfpVIl-', '1HzO7whYVOTlPrRv8ihVNxB9znz5BGFt2', '1SiDC9w6Sr4RJQK4_jG6OGWzD48lFsOYQ', '1t3bxl3qMAwKcKwQXhuIAnAGMcB8CK3iZ', 'ev-99-viewers@academiapasalo.com', '01y810tw0ykfdcf', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 99);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 100, 'ev_100', '16wjaPFy1K6NDaC3vc4cN4nfPp65Zswgk', '1TU-toDcLZrY5F9jt9w4edt9HOE3cOOMw', '1mslQZQUkzXgkqv6CV4RulW6TpbjTz5uw', '19WoItwMT8GGW_wIkFVIT5gokVAuJT-ff', 'ev-100-viewers@academiapasalo.com', '00upglbi15vpnu9', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 100);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 117, 'ev_117', '1T2WINsPJ1ydGBf-i1Zq3vG0Qz_guEr3q', '1qQn22m0xfZe14ABuN_6L7OhYArTGRn4i', '1OlZnGHgpL5hyCxRTfGxZDHDWZfjPtGuf', '1pZhOf2aCTmy7a9IX2wGF_QSjimBV5vtV', 'ev-117-viewers@academiapasalo.com', '048pi1tg17e9kyr', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 117);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 118, 'ev_118', '16xnX3GAG2ZThXU6jmkHqFfPiFAWYMMr7', '1F7leFIH2yXmaocTlMjFaIk1EZEuxvj8J', '18KVttJkNqkPgdIESeYtiDBlHcdv1Nj1Y', '1Vxoz8uzk3tsABllRSv5EybueFC6HkQu8', 'ev-118-viewers@academiapasalo.com', '0147n2zr1bdwdix', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 118);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 119, 'ev_119', '12afCBjRErVIHwrdS_UyQ7ZztGrEcQBkm', '1DdXTuJNc7cBwUngInkKBXjm7lE987_lq', '1yqCueEIiIdhJYkyX40KFgUXD6zR0PRUb', '12f6Dq7uV_G7IuK2sk2BtASsG83aZ0gLr', 'ev-119-viewers@academiapasalo.com', '025b2l0r1rs2fwa', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 119);
INSERT INTO evaluation_drive_access (evaluation_id, scope_key, drive_scope_folder_id, drive_videos_folder_id, drive_documents_folder_id, drive_archived_folder_id, viewer_group_email, viewer_group_id, is_active, created_at, updated_at)
SELECT 120, 'ev_120', '1yivH_i1EXwPsLE0AP6slSu0VPHycJPtU', '1gr0Y_x48vgnnDDClbRL0c8jgWs4nIynf', '1XHIoU4p0bbvpfPk0T_ZJkZMY6exnxIb8', '1ZczGMxyNKN0ZbezTyj76Yv0nYlX8Z5e_', 'ev-120-viewers@academiapasalo.com', '04anzqyu2vw1739', 1, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM evaluation_drive_access WHERE evaluation_id = 120);

-- 2) Videos de sesiones (recording)
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/19KItOBT4RqdOj90lNP2qv_uA6JAnyeZ_/view?usp=drivesdk',
    recording_file_id = '19KItOBT4RqdOj90lNP2qv_uA6JAnyeZ_',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 17;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/13K91nksNwjgR2qxRuGB5rG-8tyA_HhQr/view?usp=drivesdk',
    recording_file_id = '13K91nksNwjgR2qxRuGB5rG-8tyA_HhQr',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 18;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1dCIADh3MFaIlzM27FiYBrbniRVC1lDgw/view?usp=drivesdk',
    recording_file_id = '1dCIADh3MFaIlzM27FiYBrbniRVC1lDgw',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 19;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/15kxIVZvpaum62JuwWBasyrlRoGk0oU8T/view?usp=drivesdk',
    recording_file_id = '15kxIVZvpaum62JuwWBasyrlRoGk0oU8T',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 20;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1_el31nf1XviFrVT-ZOHBAXElW3UcO3oj/view?usp=drivesdk',
    recording_file_id = '1_el31nf1XviFrVT-ZOHBAXElW3UcO3oj',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 37;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1JDEIwJZu8it2czR0CAnjSBFOl94U9gCf/view?usp=drivesdk',
    recording_file_id = '1JDEIwJZu8it2czR0CAnjSBFOl94U9gCf',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 38;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1uJKTvzRQ2RY1UhPInrl-YyxFggIKVSZB/view?usp=drivesdk',
    recording_file_id = '1uJKTvzRQ2RY1UhPInrl-YyxFggIKVSZB',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 39;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/14FolPG2SrYNdjsyVTZcTAsmt9mmTn9OO/view?usp=drivesdk',
    recording_file_id = '14FolPG2SrYNdjsyVTZcTAsmt9mmTn9OO',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 40;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1ZeQwYnYoegklnCHJNdt9bAoQ5VcXzGV2/view?usp=drivesdk',
    recording_file_id = '1ZeQwYnYoegklnCHJNdt9bAoQ5VcXzGV2',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 57;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1q5mOj2nwH-5y1v-_vIjnL6IOVCbgSgzH/view?usp=drivesdk',
    recording_file_id = '1q5mOj2nwH-5y1v-_vIjnL6IOVCbgSgzH',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 58;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1ZH_1vQLlms7L08rJCCe3fqAuFncEaoiW/view?usp=drivesdk',
    recording_file_id = '1ZH_1vQLlms7L08rJCCe3fqAuFncEaoiW',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 59;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1n0c7gJ9kzCDNnRBYE9gfJFhHAlh7T_Ar/view?usp=drivesdk',
    recording_file_id = '1n0c7gJ9kzCDNnRBYE9gfJFhHAlh7T_Ar',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 60;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1fEFZ4CkGRnfiPkErdgPFHBD-NhUAo4Cs/view?usp=drivesdk',
    recording_file_id = '1fEFZ4CkGRnfiPkErdgPFHBD-NhUAo4Cs',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 77;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1ne1mk3JPpNt7T2fKzrs73nJEZg5cGKA1/view?usp=drivesdk',
    recording_file_id = '1ne1mk3JPpNt7T2fKzrs73nJEZg5cGKA1',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 78;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1hmKBSfLV954geiVqiIWefgwrr3ShQT3E/view?usp=drivesdk',
    recording_file_id = '1hmKBSfLV954geiVqiIWefgwrr3ShQT3E',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 79;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1pHUHsEXxISnLbQWX5bpg1vh9xk40hkfA/view?usp=drivesdk',
    recording_file_id = '1pHUHsEXxISnLbQWX5bpg1vh9xk40hkfA',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 80;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1VM1K8_xj2zbxuPpMVMTzwMfrbJOQsCz4/view?usp=drivesdk',
    recording_file_id = '1VM1K8_xj2zbxuPpMVMTzwMfrbJOQsCz4',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 97;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1veB_ZPB8xvdLIFSo1moshzhrL0Mb2LoF/view?usp=drivesdk',
    recording_file_id = '1veB_ZPB8xvdLIFSo1moshzhrL0Mb2LoF',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 98;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1JZ1hiP8xfzmblgqP_IyOMx28O3SV9XU9/view?usp=drivesdk',
    recording_file_id = '1JZ1hiP8xfzmblgqP_IyOMx28O3SV9XU9',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 99;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1Ip5nIK6kGBoYg5U5ZJ9S7chLJjTC_II_/view?usp=drivesdk',
    recording_file_id = '1Ip5nIK6kGBoYg5U5ZJ9S7chLJjTC_II_',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 100;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1G4AIYqzaAkQP2nNfPq8itCxVgfdjX97d/view?usp=drivesdk',
    recording_file_id = '1G4AIYqzaAkQP2nNfPq8itCxVgfdjX97d',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 117;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1slmg-SY6MTzxLx44gGT61-um6tdX8cXx/view?usp=drivesdk',
    recording_file_id = '1slmg-SY6MTzxLx44gGT61-um6tdX8cXx',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 118;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1n9bh0uhg4Nmtt6gElTKRWl6vFVDWDiFN/view?usp=drivesdk',
    recording_file_id = '1n9bh0uhg4Nmtt6gElTKRWl6vFVDWDiFN',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 119;
UPDATE class_event
SET recording_url = 'https://drive.google.com/file/d/1gQ616dto69rGFt9PFQhK85YvoUXyLssD/view?usp=drivesdk',
    recording_file_id = '1gQ616dto69rGFt9PFQhK85YvoUXyLssD',
    recording_status_id = @recording_ready,
    updated_at = NOW()
WHERE evaluation_id = 120;

-- 3) Video intro por course_cycle
UPDATE course_cycle
SET intro_video_url = 'https://drive.google.com/file/d/13SwkbwjPkD2rjNAZtsTJ17A_occsGSpa/view?usp=drivesdk',
    intro_video_file_id = '13SwkbwjPkD2rjNAZtsTJ17A_occsGSpa'
WHERE id = 17;
UPDATE course_cycle
SET intro_video_url = 'https://drive.google.com/file/d/1HUPpE2xs1zppDsRhoAIlDojBkivN_96Y/view?usp=drivesdk',
    intro_video_file_id = '1HUPpE2xs1zppDsRhoAIlDojBkivN_96Y'
WHERE id = 18;
UPDATE course_cycle
SET intro_video_url = 'https://drive.google.com/file/d/1edh_3S3SQWhvC_4-6_xG3wvj5-yaWPaR/view?usp=drivesdk',
    intro_video_file_id = '1edh_3S3SQWhvC_4-6_xG3wvj5-yaWPaR'
WHERE id = 19;
UPDATE course_cycle
SET intro_video_url = 'https://drive.google.com/file/d/1QwCLyvXu-ICDTj8-twXeOUvHfZIpasin/view?usp=drivesdk',
    intro_video_file_id = '1QwCLyvXu-ICDTj8-twXeOUvHfZIpasin'
WHERE id = 20;

-- 4) File resources
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1Ogddc0UeMSvWMpcAFLTImGNMiAU8iZR1', '1INF61-2026-1-SILABO__ev_17.PDF', 'application/pdf', 27856, 'GDRIVE', '1Ogddc0UeMSvWMpcAFLTImGNMiAU8iZR1', 'https://drive.google.com/file/d/1Ogddc0UeMSvWMpcAFLTImGNMiAU8iZR1/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1Ogddc0UeMSvWMpcAFLTImGNMiAU8iZR1');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1zv_qi6c_BUcJ49I8UfBOWazFnMSW0IUF', '1INF61-2026-1-SILABO__ev_18.PDF', 'application/pdf', 27856, 'GDRIVE', '1zv_qi6c_BUcJ49I8UfBOWazFnMSW0IUF', 'https://drive.google.com/file/d/1zv_qi6c_BUcJ49I8UfBOWazFnMSW0IUF/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1zv_qi6c_BUcJ49I8UfBOWazFnMSW0IUF');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1iF_65Sy6k38DdlALAabE8l5MKkloTMlt', '1INF61-2026-1-SILABO__ev_19.PDF', 'application/pdf', 27856, 'GDRIVE', '1iF_65Sy6k38DdlALAabE8l5MKkloTMlt', 'https://drive.google.com/file/d/1iF_65Sy6k38DdlALAabE8l5MKkloTMlt/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1iF_65Sy6k38DdlALAabE8l5MKkloTMlt');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1IS_JUAkrp_dLCg3lSBljWWzeKFvIHFSx', '1INF61-2026-1-SILABO__ev_20.PDF', 'application/pdf', 27856, 'GDRIVE', '1IS_JUAkrp_dLCg3lSBljWWzeKFvIHFSx', 'https://drive.google.com/file/d/1IS_JUAkrp_dLCg3lSBljWWzeKFvIHFSx/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1IS_JUAkrp_dLCg3lSBljWWzeKFvIHFSx');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1IuOE_Lrn9Qbd6kjDX0P35rcCmWKc0QG-', '1INF61-2026-1-SILABO__ev_37.PDF', 'application/pdf', 27856, 'GDRIVE', '1IuOE_Lrn9Qbd6kjDX0P35rcCmWKc0QG-', 'https://drive.google.com/file/d/1IuOE_Lrn9Qbd6kjDX0P35rcCmWKc0QG-/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1IuOE_Lrn9Qbd6kjDX0P35rcCmWKc0QG-');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1GYj9G4Y0Wa8FQnTGTZOo31N4tYTXC-tP', '1INF61-2026-1-SILABO__ev_38.PDF', 'application/pdf', 27856, 'GDRIVE', '1GYj9G4Y0Wa8FQnTGTZOo31N4tYTXC-tP', 'https://drive.google.com/file/d/1GYj9G4Y0Wa8FQnTGTZOo31N4tYTXC-tP/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1GYj9G4Y0Wa8FQnTGTZOo31N4tYTXC-tP');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1KEazU9dUJoM888Oim1HGoJ-Z9gyNDWCd', '1INF61-2026-1-SILABO__ev_39.PDF', 'application/pdf', 27856, 'GDRIVE', '1KEazU9dUJoM888Oim1HGoJ-Z9gyNDWCd', 'https://drive.google.com/file/d/1KEazU9dUJoM888Oim1HGoJ-Z9gyNDWCd/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1KEazU9dUJoM888Oim1HGoJ-Z9gyNDWCd');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-16uxufc0ctqVO2iC5yzhwuMZDxRZvt_Yh', '1INF61-2026-1-SILABO__ev_40.PDF', 'application/pdf', 27856, 'GDRIVE', '16uxufc0ctqVO2iC5yzhwuMZDxRZvt_Yh', 'https://drive.google.com/file/d/16uxufc0ctqVO2iC5yzhwuMZDxRZvt_Yh/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '16uxufc0ctqVO2iC5yzhwuMZDxRZvt_Yh');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1wpcp2DpTM_KEO3k-GQBDEAgm6mC7U47y', '1INF61-2026-1-SILABO__ev_57.PDF', 'application/pdf', 27856, 'GDRIVE', '1wpcp2DpTM_KEO3k-GQBDEAgm6mC7U47y', 'https://drive.google.com/file/d/1wpcp2DpTM_KEO3k-GQBDEAgm6mC7U47y/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1wpcp2DpTM_KEO3k-GQBDEAgm6mC7U47y');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1hwGVVNbam9j4VnVmcKAphuIfDpR3NNge', '1INF61-2026-1-SILABO__ev_58.PDF', 'application/pdf', 27856, 'GDRIVE', '1hwGVVNbam9j4VnVmcKAphuIfDpR3NNge', 'https://drive.google.com/file/d/1hwGVVNbam9j4VnVmcKAphuIfDpR3NNge/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1hwGVVNbam9j4VnVmcKAphuIfDpR3NNge');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1LJXZ4-F9Ia0k0Jt5Us2bUa6285s57S9m', '1INF61-2026-1-SILABO__ev_59.PDF', 'application/pdf', 27856, 'GDRIVE', '1LJXZ4-F9Ia0k0Jt5Us2bUa6285s57S9m', 'https://drive.google.com/file/d/1LJXZ4-F9Ia0k0Jt5Us2bUa6285s57S9m/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1LJXZ4-F9Ia0k0Jt5Us2bUa6285s57S9m');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1a7G88LDJXvS9fRchV9_xod_FxMUttrfh', '1INF61-2026-1-SILABO__ev_60.PDF', 'application/pdf', 27856, 'GDRIVE', '1a7G88LDJXvS9fRchV9_xod_FxMUttrfh', 'https://drive.google.com/file/d/1a7G88LDJXvS9fRchV9_xod_FxMUttrfh/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1a7G88LDJXvS9fRchV9_xod_FxMUttrfh');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1nSleL8cmsj3wKh-7GOQIUztki8uvXLZS', '1INF61-2026-1-SILABO__ev_77.PDF', 'application/pdf', 27856, 'GDRIVE', '1nSleL8cmsj3wKh-7GOQIUztki8uvXLZS', 'https://drive.google.com/file/d/1nSleL8cmsj3wKh-7GOQIUztki8uvXLZS/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1nSleL8cmsj3wKh-7GOQIUztki8uvXLZS');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1V7-079VawmPgIXNuBGVDBrddzHT_0C-t', '1INF61-2026-1-SILABO__ev_78.PDF', 'application/pdf', 27856, 'GDRIVE', '1V7-079VawmPgIXNuBGVDBrddzHT_0C-t', 'https://drive.google.com/file/d/1V7-079VawmPgIXNuBGVDBrddzHT_0C-t/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1V7-079VawmPgIXNuBGVDBrddzHT_0C-t');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1o_xyDG19b-K1Djgo2ypu7W1m78-bBFHz', '1INF61-2026-1-SILABO__ev_79.PDF', 'application/pdf', 27856, 'GDRIVE', '1o_xyDG19b-K1Djgo2ypu7W1m78-bBFHz', 'https://drive.google.com/file/d/1o_xyDG19b-K1Djgo2ypu7W1m78-bBFHz/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1o_xyDG19b-K1Djgo2ypu7W1m78-bBFHz');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1Zcx1njC8wQhxLXrozJhgE1ej-ThFt_L2', '1INF61-2026-1-SILABO__ev_80.PDF', 'application/pdf', 27856, 'GDRIVE', '1Zcx1njC8wQhxLXrozJhgE1ej-ThFt_L2', 'https://drive.google.com/file/d/1Zcx1njC8wQhxLXrozJhgE1ej-ThFt_L2/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1Zcx1njC8wQhxLXrozJhgE1ej-ThFt_L2');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1w0yqHML1uZ5b7ewPQTzG3_vKOlgZjjz3', '1INF61-2026-1-SILABO__ev_97.PDF', 'application/pdf', 27856, 'GDRIVE', '1w0yqHML1uZ5b7ewPQTzG3_vKOlgZjjz3', 'https://drive.google.com/file/d/1w0yqHML1uZ5b7ewPQTzG3_vKOlgZjjz3/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1w0yqHML1uZ5b7ewPQTzG3_vKOlgZjjz3');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1FOahWFg-8pD6vwHCaYAGw09lX8C5cE5e', '1INF61-2026-1-SILABO__ev_98.PDF', 'application/pdf', 27856, 'GDRIVE', '1FOahWFg-8pD6vwHCaYAGw09lX8C5cE5e', 'https://drive.google.com/file/d/1FOahWFg-8pD6vwHCaYAGw09lX8C5cE5e/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1FOahWFg-8pD6vwHCaYAGw09lX8C5cE5e');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1yPx0BjP5wzyig1Mt9hWokRi4QJn2m04c', '1INF61-2026-1-SILABO__ev_99.PDF', 'application/pdf', 27856, 'GDRIVE', '1yPx0BjP5wzyig1Mt9hWokRi4QJn2m04c', 'https://drive.google.com/file/d/1yPx0BjP5wzyig1Mt9hWokRi4QJn2m04c/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1yPx0BjP5wzyig1Mt9hWokRi4QJn2m04c');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1-_6n8TdDvX5U6rusEVedxKGrYJREvzsz', '1INF61-2026-1-SILABO__ev_100.PDF', 'application/pdf', 27856, 'GDRIVE', '1-_6n8TdDvX5U6rusEVedxKGrYJREvzsz', 'https://drive.google.com/file/d/1-_6n8TdDvX5U6rusEVedxKGrYJREvzsz/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1-_6n8TdDvX5U6rusEVedxKGrYJREvzsz');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-14DKytkL7pL0b-HEsVFUMf5G-zx9o7phr', '1INF61-2026-1-SILABO__ev_117.PDF', 'application/pdf', 27856, 'GDRIVE', '14DKytkL7pL0b-HEsVFUMf5G-zx9o7phr', 'https://drive.google.com/file/d/14DKytkL7pL0b-HEsVFUMf5G-zx9o7phr/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '14DKytkL7pL0b-HEsVFUMf5G-zx9o7phr');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1BVoJI-4MvmGsTycTgfamD2sl_fNyd-L4', '1INF61-2026-1-SILABO__ev_118.PDF', 'application/pdf', 27856, 'GDRIVE', '1BVoJI-4MvmGsTycTgfamD2sl_fNyd-L4', 'https://drive.google.com/file/d/1BVoJI-4MvmGsTycTgfamD2sl_fNyd-L4/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1BVoJI-4MvmGsTycTgfamD2sl_fNyd-L4');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1IEAjeV8kY-SSanGTm1C0U5IsRhgKJFSS', '1INF61-2026-1-SILABO__ev_119.PDF', 'application/pdf', 27856, 'GDRIVE', '1IEAjeV8kY-SSanGTm1C0U5IsRhgKJFSS', 'https://drive.google.com/file/d/1IEAjeV8kY-SSanGTm1C0U5IsRhgKJFSS/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1IEAjeV8kY-SSanGTm1C0U5IsRhgKJFSS');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-17hhIUWbPE_BBpthF2qxD1UPFcwBcKRpo', '1INF61-2026-1-SILABO__ev_120.PDF', 'application/pdf', 27856, 'GDRIVE', '17hhIUWbPE_BBpthF2qxD1UPFcwBcKRpo', 'https://drive.google.com/file/d/17hhIUWbPE_BBpthF2qxD1UPFcwBcKRpo/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '17hhIUWbPE_BBpthF2qxD1UPFcwBcKRpo');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1WwBGsVlrBBfSct0hQTyz6N46IlGC0bq9', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1WwBGsVlrBBfSct0hQTyz6N46IlGC0bq9', 'https://drive.google.com/file/d/1WwBGsVlrBBfSct0hQTyz6N46IlGC0bq9/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1WwBGsVlrBBfSct0hQTyz6N46IlGC0bq9');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1HbbEumBCCjeaS5xzogm5vGZB29xZzgMX', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1HbbEumBCCjeaS5xzogm5vGZB29xZzgMX', 'https://docs.google.com/document/d/1HbbEumBCCjeaS5xzogm5vGZB29xZzgMX/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1HbbEumBCCjeaS5xzogm5vGZB29xZzgMX');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1PtPvS8ecvhholw1Lh6FvoD5QGmqq-Kqo', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1PtPvS8ecvhholw1Lh6FvoD5QGmqq-Kqo', 'https://drive.google.com/file/d/1PtPvS8ecvhholw1Lh6FvoD5QGmqq-Kqo/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1PtPvS8ecvhholw1Lh6FvoD5QGmqq-Kqo');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1uTkkdHAc86dDFdy75SUPeGZZc4N2FIb7', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1uTkkdHAc86dDFdy75SUPeGZZc4N2FIb7', 'https://docs.google.com/document/d/1uTkkdHAc86dDFdy75SUPeGZZc4N2FIb7/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1uTkkdHAc86dDFdy75SUPeGZZc4N2FIb7');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1KHW-Jb-zXlOItZfvdiOlF4VYZ_zkLeaR', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1KHW-Jb-zXlOItZfvdiOlF4VYZ_zkLeaR', 'https://drive.google.com/file/d/1KHW-Jb-zXlOItZfvdiOlF4VYZ_zkLeaR/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1KHW-Jb-zXlOItZfvdiOlF4VYZ_zkLeaR');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1IxATftwfdn77ejslRMM97JsFe3y2Idtt', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1IxATftwfdn77ejslRMM97JsFe3y2Idtt', 'https://docs.google.com/document/d/1IxATftwfdn77ejslRMM97JsFe3y2Idtt/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1IxATftwfdn77ejslRMM97JsFe3y2Idtt');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1G6BKx0gj9mFC9Jf_AkyZynMhcim1LZKg', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1G6BKx0gj9mFC9Jf_AkyZynMhcim1LZKg', 'https://drive.google.com/file/d/1G6BKx0gj9mFC9Jf_AkyZynMhcim1LZKg/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1G6BKx0gj9mFC9Jf_AkyZynMhcim1LZKg');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1Znjj_3cao8oX9dGT8l7N9W7WNcyN4oyy', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1Znjj_3cao8oX9dGT8l7N9W7WNcyN4oyy', 'https://docs.google.com/document/d/1Znjj_3cao8oX9dGT8l7N9W7WNcyN4oyy/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1Znjj_3cao8oX9dGT8l7N9W7WNcyN4oyy');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1MlALOYgamI6m87oUMNT9kYEuXz7NM05U', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1MlALOYgamI6m87oUMNT9kYEuXz7NM05U', 'https://drive.google.com/file/d/1MlALOYgamI6m87oUMNT9kYEuXz7NM05U/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1MlALOYgamI6m87oUMNT9kYEuXz7NM05U');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1rl11bF3mj7Yh2qnFhECCJkIxODotclRA', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1rl11bF3mj7Yh2qnFhECCJkIxODotclRA', 'https://docs.google.com/document/d/1rl11bF3mj7Yh2qnFhECCJkIxODotclRA/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1rl11bF3mj7Yh2qnFhECCJkIxODotclRA');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1ieOLbKJVcwyerEbjSQPsI7HAmkyuYFB2', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1ieOLbKJVcwyerEbjSQPsI7HAmkyuYFB2', 'https://drive.google.com/file/d/1ieOLbKJVcwyerEbjSQPsI7HAmkyuYFB2/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1ieOLbKJVcwyerEbjSQPsI7HAmkyuYFB2');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1gohb7IoErtwtpgDuYtzLyCTXY0ogOEDo', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1gohb7IoErtwtpgDuYtzLyCTXY0ogOEDo', 'https://docs.google.com/document/d/1gohb7IoErtwtpgDuYtzLyCTXY0ogOEDo/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1gohb7IoErtwtpgDuYtzLyCTXY0ogOEDo');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1ATRszqqODvJSEIrQu1aeLX5GFSmfPrSf', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1ATRszqqODvJSEIrQu1aeLX5GFSmfPrSf', 'https://drive.google.com/file/d/1ATRszqqODvJSEIrQu1aeLX5GFSmfPrSf/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1ATRszqqODvJSEIrQu1aeLX5GFSmfPrSf');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1iE0rIqb4ILSk-NWtC-JKiMRv-ICM-nj5', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1iE0rIqb4ILSk-NWtC-JKiMRv-ICM-nj5', 'https://docs.google.com/document/d/1iE0rIqb4ILSk-NWtC-JKiMRv-ICM-nj5/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1iE0rIqb4ILSk-NWtC-JKiMRv-ICM-nj5');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1axSADderCbGH6Gcec7t5EZwSnWDsb3vf', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1axSADderCbGH6Gcec7t5EZwSnWDsb3vf', 'https://drive.google.com/file/d/1axSADderCbGH6Gcec7t5EZwSnWDsb3vf/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1axSADderCbGH6Gcec7t5EZwSnWDsb3vf');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-11bxBh8F9Qgz5FKbI2gQocwaK20XwWXw_', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '11bxBh8F9Qgz5FKbI2gQocwaK20XwWXw_', 'https://docs.google.com/document/d/11bxBh8F9Qgz5FKbI2gQocwaK20XwWXw_/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '11bxBh8F9Qgz5FKbI2gQocwaK20XwWXw_');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1Ahuar298z-ghOjGH5_VXg4zv-7ae0dbh', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1Ahuar298z-ghOjGH5_VXg4zv-7ae0dbh', 'https://drive.google.com/file/d/1Ahuar298z-ghOjGH5_VXg4zv-7ae0dbh/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1Ahuar298z-ghOjGH5_VXg4zv-7ae0dbh');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1e-1zASB9V7M5MGstIsWAIsiuoVJ0w49g', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1e-1zASB9V7M5MGstIsWAIsiuoVJ0w49g', 'https://docs.google.com/document/d/1e-1zASB9V7M5MGstIsWAIsiuoVJ0w49g/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1e-1zASB9V7M5MGstIsWAIsiuoVJ0w49g');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-15EaGkROfLUstamUD0yi51Te6QVFmyFQM', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '15EaGkROfLUstamUD0yi51Te6QVFmyFQM', 'https://drive.google.com/file/d/15EaGkROfLUstamUD0yi51Te6QVFmyFQM/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '15EaGkROfLUstamUD0yi51Te6QVFmyFQM');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1sEIH8xgZecj-cBfCWAQ7z45fbi01XW4f', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1sEIH8xgZecj-cBfCWAQ7z45fbi01XW4f', 'https://docs.google.com/document/d/1sEIH8xgZecj-cBfCWAQ7z45fbi01XW4f/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1sEIH8xgZecj-cBfCWAQ7z45fbi01XW4f');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1yrpsS37Xh6QqCwdfyD5NEKlpiHtAKX1a', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1yrpsS37Xh6QqCwdfyD5NEKlpiHtAKX1a', 'https://drive.google.com/file/d/1yrpsS37Xh6QqCwdfyD5NEKlpiHtAKX1a/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1yrpsS37Xh6QqCwdfyD5NEKlpiHtAKX1a');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1aadszK56LMsKnDDvQjrLpT-Bt61D8Ao_', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1aadszK56LMsKnDDvQjrLpT-Bt61D8Ao_', 'https://docs.google.com/document/d/1aadszK56LMsKnDDvQjrLpT-Bt61D8Ao_/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1aadszK56LMsKnDDvQjrLpT-Bt61D8Ao_');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1QbqnLF8WMyOzvUdGTz-YbnW0XVF3qIy6', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1QbqnLF8WMyOzvUdGTz-YbnW0XVF3qIy6', 'https://drive.google.com/file/d/1QbqnLF8WMyOzvUdGTz-YbnW0XVF3qIy6/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1QbqnLF8WMyOzvUdGTz-YbnW0XVF3qIy6');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1qxmu1KE25PLwTx6GAeA52Is4HrqqQkx4', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1qxmu1KE25PLwTx6GAeA52Is4HrqqQkx4', 'https://docs.google.com/document/d/1qxmu1KE25PLwTx6GAeA52Is4HrqqQkx4/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1qxmu1KE25PLwTx6GAeA52Is4HrqqQkx4');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1GR0ucgSxXfbRxwzcUdbcAtVWB_eBW1bJ', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1GR0ucgSxXfbRxwzcUdbcAtVWB_eBW1bJ', 'https://drive.google.com/file/d/1GR0ucgSxXfbRxwzcUdbcAtVWB_eBW1bJ/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1GR0ucgSxXfbRxwzcUdbcAtVWB_eBW1bJ');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1cSPfOcZRaBOWkyWUdb-88UhKRbN0PeJq', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1cSPfOcZRaBOWkyWUdb-88UhKRbN0PeJq', 'https://docs.google.com/document/d/1cSPfOcZRaBOWkyWUdb-88UhKRbN0PeJq/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1cSPfOcZRaBOWkyWUdb-88UhKRbN0PeJq');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1-LS4b3Dymgd8qxdh4WJSHjLk0P-G2LPK', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1-LS4b3Dymgd8qxdh4WJSHjLk0P-G2LPK', 'https://drive.google.com/file/d/1-LS4b3Dymgd8qxdh4WJSHjLk0P-G2LPK/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1-LS4b3Dymgd8qxdh4WJSHjLk0P-G2LPK');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1JhbfILUb_9PX2C3ebsVmQCPWIjDEckb1', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1JhbfILUb_9PX2C3ebsVmQCPWIjDEckb1', 'https://docs.google.com/document/d/1JhbfILUb_9PX2C3ebsVmQCPWIjDEckb1/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1JhbfILUb_9PX2C3ebsVmQCPWIjDEckb1');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1tPxXLm9ogNt1ZhNiqWcy1VCaukooB3qa', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1tPxXLm9ogNt1ZhNiqWcy1VCaukooB3qa', 'https://drive.google.com/file/d/1tPxXLm9ogNt1ZhNiqWcy1VCaukooB3qa/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1tPxXLm9ogNt1ZhNiqWcy1VCaukooB3qa');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1Tv24MmDdpJ-VOkh51c1CMk7UOi3G6393', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1Tv24MmDdpJ-VOkh51c1CMk7UOi3G6393', 'https://docs.google.com/document/d/1Tv24MmDdpJ-VOkh51c1CMk7UOi3G6393/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1Tv24MmDdpJ-VOkh51c1CMk7UOi3G6393');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1AqnrDPZYRj6G-q4E2X8WxbYDN2yvLhle', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1AqnrDPZYRj6G-q4E2X8WxbYDN2yvLhle', 'https://drive.google.com/file/d/1AqnrDPZYRj6G-q4E2X8WxbYDN2yvLhle/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1AqnrDPZYRj6G-q4E2X8WxbYDN2yvLhle');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1czeTuR2huO8lhj8cxNNSq3mTLllwrch6', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1czeTuR2huO8lhj8cxNNSq3mTLllwrch6', 'https://docs.google.com/document/d/1czeTuR2huO8lhj8cxNNSq3mTLllwrch6/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1czeTuR2huO8lhj8cxNNSq3mTLllwrch6');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1iLovA-k1FgkuzrcPtRSReJoOwxh2oEWW', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1iLovA-k1FgkuzrcPtRSReJoOwxh2oEWW', 'https://drive.google.com/file/d/1iLovA-k1FgkuzrcPtRSReJoOwxh2oEWW/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1iLovA-k1FgkuzrcPtRSReJoOwxh2oEWW');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1f02AmOXIuiVHBo3bq1s7mqJLvv5JU3Jj', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1f02AmOXIuiVHBo3bq1s7mqJLvv5JU3Jj', 'https://docs.google.com/document/d/1f02AmOXIuiVHBo3bq1s7mqJLvv5JU3Jj/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1f02AmOXIuiVHBo3bq1s7mqJLvv5JU3Jj');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1xolEpP_9C7diH-Ngb6tj2BR3tU7aGlLl', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1xolEpP_9C7diH-Ngb6tj2BR3tU7aGlLl', 'https://drive.google.com/file/d/1xolEpP_9C7diH-Ngb6tj2BR3tU7aGlLl/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1xolEpP_9C7diH-Ngb6tj2BR3tU7aGlLl');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1BmjmXCEdCLbK-c0nU7vPAfGpZ3TKz7Vh', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1BmjmXCEdCLbK-c0nU7vPAfGpZ3TKz7Vh', 'https://docs.google.com/document/d/1BmjmXCEdCLbK-c0nU7vPAfGpZ3TKz7Vh/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1BmjmXCEdCLbK-c0nU7vPAfGpZ3TKz7Vh');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1VDOuu9BC2dr1n4ub0_H2lCbc_ShTVk82', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1VDOuu9BC2dr1n4ub0_H2lCbc_ShTVk82', 'https://drive.google.com/file/d/1VDOuu9BC2dr1n4ub0_H2lCbc_ShTVk82/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1VDOuu9BC2dr1n4ub0_H2lCbc_ShTVk82');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1Wz-oBiLcaWT3pN7CDCTLR7dGAUeGno8L', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1Wz-oBiLcaWT3pN7CDCTLR7dGAUeGno8L', 'https://docs.google.com/document/d/1Wz-oBiLcaWT3pN7CDCTLR7dGAUeGno8L/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1Wz-oBiLcaWT3pN7CDCTLR7dGAUeGno8L');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1YIUpS97LvLzN1erWtzfkSkkJrw700SvG', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1YIUpS97LvLzN1erWtzfkSkkJrw700SvG', 'https://drive.google.com/file/d/1YIUpS97LvLzN1erWtzfkSkkJrw700SvG/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1YIUpS97LvLzN1erWtzfkSkkJrw700SvG');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1FNSwSQCwcuoTc0XVCs2KuX1HPr0FWqRl', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1FNSwSQCwcuoTc0XVCs2KuX1HPr0FWqRl', 'https://docs.google.com/document/d/1FNSwSQCwcuoTc0XVCs2KuX1HPr0FWqRl/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1FNSwSQCwcuoTc0XVCs2KuX1HPr0FWqRl');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1rZkeki8LR8kPy4rLEIosX19qVrfSl12v', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1rZkeki8LR8kPy4rLEIosX19qVrfSl12v', 'https://drive.google.com/file/d/1rZkeki8LR8kPy4rLEIosX19qVrfSl12v/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1rZkeki8LR8kPy4rLEIosX19qVrfSl12v');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-15mTVQ3-zh9xBCHlo0UPtlixeYFikfRI6', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '15mTVQ3-zh9xBCHlo0UPtlixeYFikfRI6', 'https://docs.google.com/document/d/15mTVQ3-zh9xBCHlo0UPtlixeYFikfRI6/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '15mTVQ3-zh9xBCHlo0UPtlixeYFikfRI6');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1IrlZwkc9j07mKXSP1TDi0qMCrJqTdZCd', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1IrlZwkc9j07mKXSP1TDi0qMCrJqTdZCd', 'https://drive.google.com/file/d/1IrlZwkc9j07mKXSP1TDi0qMCrJqTdZCd/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1IrlZwkc9j07mKXSP1TDi0qMCrJqTdZCd');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1rR0dOCbyKN0sq__bC3NW6qO0-g4fF04i', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1rR0dOCbyKN0sq__bC3NW6qO0-g4fF04i', 'https://docs.google.com/document/d/1rR0dOCbyKN0sq__bC3NW6qO0-g4fF04i/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1rR0dOCbyKN0sq__bC3NW6qO0-g4fF04i');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1GolyxlvXx6Ex6urzXiNsAD_HLdm_BlQM', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1GolyxlvXx6Ex6urzXiNsAD_HLdm_BlQM', 'https://drive.google.com/file/d/1GolyxlvXx6Ex6urzXiNsAD_HLdm_BlQM/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1GolyxlvXx6Ex6urzXiNsAD_HLdm_BlQM');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1cW7pCOMxcOnvQYapgE-fSpDoRc8CPDj_', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1cW7pCOMxcOnvQYapgE-fSpDoRc8CPDj_', 'https://docs.google.com/document/d/1cW7pCOMxcOnvQYapgE-fSpDoRc8CPDj_/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1cW7pCOMxcOnvQYapgE-fSpDoRc8CPDj_');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1a-6PBpxDbSAGBNj70lOPtTzehs1Zrqu9', 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', 'application/pdf', 95413, 'GDRIVE', '1a-6PBpxDbSAGBNj70lOPtTzehs1Zrqu9', 'https://drive.google.com/file/d/1a-6PBpxDbSAGBNj70lOPtTzehs1Zrqu9/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1a-6PBpxDbSAGBNj70lOPtTzehs1Zrqu9');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1zpHe-mVBdv25z0Bm5DiH7aqe9zF9Mk3Q', '1INF26-Plantilla_E2.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 253021, 'GDRIVE', '1zpHe-mVBdv25z0Bm5DiH7aqe9zF9Mk3Q', 'https://docs.google.com/document/d/1zpHe-mVBdv25z0Bm5DiH7aqe9zF9Mk3Q/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1zpHe-mVBdv25z0Bm5DiH7aqe9zF9Mk3Q');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1G9vzGUgf02XVfZzIzIvNEyqvoDgTu4vS', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1G9vzGUgf02XVfZzIzIvNEyqvoDgTu4vS', 'https://docs.google.com/document/d/1G9vzGUgf02XVfZzIzIvNEyqvoDgTu4vS/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1G9vzGUgf02XVfZzIzIvNEyqvoDgTu4vS');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1fTNUI87Wgy0tbIrMw4YzTsDh9LBAvu6b', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1fTNUI87Wgy0tbIrMw4YzTsDh9LBAvu6b', 'https://drive.google.com/file/d/1fTNUI87Wgy0tbIrMw4YzTsDh9LBAvu6b/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1fTNUI87Wgy0tbIrMw4YzTsDh9LBAvu6b');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1aSQdSPPbvVR9dNoRKlbuF723gO2qjgXU', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1aSQdSPPbvVR9dNoRKlbuF723gO2qjgXU', 'https://docs.google.com/document/d/1aSQdSPPbvVR9dNoRKlbuF723gO2qjgXU/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1aSQdSPPbvVR9dNoRKlbuF723gO2qjgXU');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1ZrSccpKoyZjM5NCdCXdgsRObqlxQIFrY', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1ZrSccpKoyZjM5NCdCXdgsRObqlxQIFrY', 'https://drive.google.com/file/d/1ZrSccpKoyZjM5NCdCXdgsRObqlxQIFrY/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1ZrSccpKoyZjM5NCdCXdgsRObqlxQIFrY');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1EV7hoUtrchbCY231QhY0J0vwv_MrFSDg', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1EV7hoUtrchbCY231QhY0J0vwv_MrFSDg', 'https://docs.google.com/document/d/1EV7hoUtrchbCY231QhY0J0vwv_MrFSDg/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1EV7hoUtrchbCY231QhY0J0vwv_MrFSDg');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1ObBdxEb-SLnESx6j2UDQvw1AQqqjtCPt', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1ObBdxEb-SLnESx6j2UDQvw1AQqqjtCPt', 'https://drive.google.com/file/d/1ObBdxEb-SLnESx6j2UDQvw1AQqqjtCPt/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1ObBdxEb-SLnESx6j2UDQvw1AQqqjtCPt');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1hL1y3oXkoR9OcOUzeMNznYYxetfF1mCB', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1hL1y3oXkoR9OcOUzeMNznYYxetfF1mCB', 'https://docs.google.com/document/d/1hL1y3oXkoR9OcOUzeMNznYYxetfF1mCB/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1hL1y3oXkoR9OcOUzeMNznYYxetfF1mCB');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1Yu185-8amxaFPRy8B0OTnOz1Wv8GmJI-', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1Yu185-8amxaFPRy8B0OTnOz1Wv8GmJI-', 'https://drive.google.com/file/d/1Yu185-8amxaFPRy8B0OTnOz1Wv8GmJI-/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1Yu185-8amxaFPRy8B0OTnOz1Wv8GmJI-');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1_3-mSiOJl7YwOgw4iFpuGXGSw3saHRhx', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1_3-mSiOJl7YwOgw4iFpuGXGSw3saHRhx', 'https://docs.google.com/document/d/1_3-mSiOJl7YwOgw4iFpuGXGSw3saHRhx/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1_3-mSiOJl7YwOgw4iFpuGXGSw3saHRhx');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1bRoh3Hp82UvhsqVdVgnN4nze0AutvVOT', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1bRoh3Hp82UvhsqVdVgnN4nze0AutvVOT', 'https://drive.google.com/file/d/1bRoh3Hp82UvhsqVdVgnN4nze0AutvVOT/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1bRoh3Hp82UvhsqVdVgnN4nze0AutvVOT');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1mWu90No-8YzIsqyQ33NnAGDPk9hQkao8', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1mWu90No-8YzIsqyQ33NnAGDPk9hQkao8', 'https://docs.google.com/document/d/1mWu90No-8YzIsqyQ33NnAGDPk9hQkao8/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1mWu90No-8YzIsqyQ33NnAGDPk9hQkao8');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1dh2_fk3jch7R2ScIRcgognkNhOMCQ5ct', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1dh2_fk3jch7R2ScIRcgognkNhOMCQ5ct', 'https://drive.google.com/file/d/1dh2_fk3jch7R2ScIRcgognkNhOMCQ5ct/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1dh2_fk3jch7R2ScIRcgognkNhOMCQ5ct');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1oRC7L2ZtBAmi_KyjxcUrYrv4AAwimlfl', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1oRC7L2ZtBAmi_KyjxcUrYrv4AAwimlfl', 'https://docs.google.com/document/d/1oRC7L2ZtBAmi_KyjxcUrYrv4AAwimlfl/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1oRC7L2ZtBAmi_KyjxcUrYrv4AAwimlfl');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1EQl68bYScvP_OxCukAc3pF5ajBHH_yjm', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1EQl68bYScvP_OxCukAc3pF5ajBHH_yjm', 'https://drive.google.com/file/d/1EQl68bYScvP_OxCukAc3pF5ajBHH_yjm/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1EQl68bYScvP_OxCukAc3pF5ajBHH_yjm');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1-BHHD6LDZ7sSGaPyKklXHCBEEZeDyu_X', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1-BHHD6LDZ7sSGaPyKklXHCBEEZeDyu_X', 'https://docs.google.com/document/d/1-BHHD6LDZ7sSGaPyKklXHCBEEZeDyu_X/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1-BHHD6LDZ7sSGaPyKklXHCBEEZeDyu_X');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1q01IuyC44xnWvjrnv4D0pM6ye0Umw1uE', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1q01IuyC44xnWvjrnv4D0pM6ye0Umw1uE', 'https://drive.google.com/file/d/1q01IuyC44xnWvjrnv4D0pM6ye0Umw1uE/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1q01IuyC44xnWvjrnv4D0pM6ye0Umw1uE');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1S-0qagQ7Mx7MHIxH2InHIkpRq3rgBtMB', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1S-0qagQ7Mx7MHIxH2InHIkpRq3rgBtMB', 'https://docs.google.com/document/d/1S-0qagQ7Mx7MHIxH2InHIkpRq3rgBtMB/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1S-0qagQ7Mx7MHIxH2InHIkpRq3rgBtMB');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1rqBwH1Xr-rhL5-9Pp_bMsI-NMKpafhCc', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1rqBwH1Xr-rhL5-9Pp_bMsI-NMKpafhCc', 'https://drive.google.com/file/d/1rqBwH1Xr-rhL5-9Pp_bMsI-NMKpafhCc/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1rqBwH1Xr-rhL5-9Pp_bMsI-NMKpafhCc');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1uZK4YMSixKgR79rEF-eLSvk4PW_IAUh8', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1uZK4YMSixKgR79rEF-eLSvk4PW_IAUh8', 'https://docs.google.com/document/d/1uZK4YMSixKgR79rEF-eLSvk4PW_IAUh8/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1uZK4YMSixKgR79rEF-eLSvk4PW_IAUh8');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1PBFTrE_Jz5v9f1Z9gm1fpY65w323Zdxl', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1PBFTrE_Jz5v9f1Z9gm1fpY65w323Zdxl', 'https://drive.google.com/file/d/1PBFTrE_Jz5v9f1Z9gm1fpY65w323Zdxl/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1PBFTrE_Jz5v9f1Z9gm1fpY65w323Zdxl');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1IJPpLMJodUiBjOEVcJx00OlL45BqWF1m', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1IJPpLMJodUiBjOEVcJx00OlL45BqWF1m', 'https://docs.google.com/document/d/1IJPpLMJodUiBjOEVcJx00OlL45BqWF1m/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1IJPpLMJodUiBjOEVcJx00OlL45BqWF1m');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-18jySXno0g8l8EvPi4Te68pU7f5ewjw7V', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '18jySXno0g8l8EvPi4Te68pU7f5ewjw7V', 'https://drive.google.com/file/d/18jySXno0g8l8EvPi4Te68pU7f5ewjw7V/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '18jySXno0g8l8EvPi4Te68pU7f5ewjw7V');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1h3CEHcBAQkKVqiQx7aG7ziXxDOnWrhhy', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1h3CEHcBAQkKVqiQx7aG7ziXxDOnWrhhy', 'https://docs.google.com/document/d/1h3CEHcBAQkKVqiQx7aG7ziXxDOnWrhhy/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1h3CEHcBAQkKVqiQx7aG7ziXxDOnWrhhy');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-18axkx7ikPla3uJv2XqCI6y5vuR7hU0oI', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '18axkx7ikPla3uJv2XqCI6y5vuR7hU0oI', 'https://drive.google.com/file/d/18axkx7ikPla3uJv2XqCI6y5vuR7hU0oI/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '18axkx7ikPla3uJv2XqCI6y5vuR7hU0oI');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1IYGYgFHJtvuIdGaqz8nftEyVsNLpnAxX', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1IYGYgFHJtvuIdGaqz8nftEyVsNLpnAxX', 'https://docs.google.com/document/d/1IYGYgFHJtvuIdGaqz8nftEyVsNLpnAxX/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1IYGYgFHJtvuIdGaqz8nftEyVsNLpnAxX');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-10bWkRUJI7RaMmxy-FVyJPIHl0nE2ABk8', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '10bWkRUJI7RaMmxy-FVyJPIHl0nE2ABk8', 'https://drive.google.com/file/d/10bWkRUJI7RaMmxy-FVyJPIHl0nE2ABk8/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '10bWkRUJI7RaMmxy-FVyJPIHl0nE2ABk8');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1VIBhqgT1YA9sRU6vtmzdX5gD-UUlnoax', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1VIBhqgT1YA9sRU6vtmzdX5gD-UUlnoax', 'https://docs.google.com/document/d/1VIBhqgT1YA9sRU6vtmzdX5gD-UUlnoax/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1VIBhqgT1YA9sRU6vtmzdX5gD-UUlnoax');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1OfvkqnM2V-bC5G0N059ZCDbRLbf2atCK', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1OfvkqnM2V-bC5G0N059ZCDbRLbf2atCK', 'https://drive.google.com/file/d/1OfvkqnM2V-bC5G0N059ZCDbRLbf2atCK/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1OfvkqnM2V-bC5G0N059ZCDbRLbf2atCK');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-11hNB3qBHIMqhLQEY0gKmD1cNe0qNKR7G', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '11hNB3qBHIMqhLQEY0gKmD1cNe0qNKR7G', 'https://docs.google.com/document/d/11hNB3qBHIMqhLQEY0gKmD1cNe0qNKR7G/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '11hNB3qBHIMqhLQEY0gKmD1cNe0qNKR7G');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1cndWa9mWEa4wy5iKfNjslX6XWKCvJkxf', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1cndWa9mWEa4wy5iKfNjslX6XWKCvJkxf', 'https://drive.google.com/file/d/1cndWa9mWEa4wy5iKfNjslX6XWKCvJkxf/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1cndWa9mWEa4wy5iKfNjslX6XWKCvJkxf');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1OJ0f2DV1ZpnHQO49wSXXuE-rKv_jh6fO', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1OJ0f2DV1ZpnHQO49wSXXuE-rKv_jh6fO', 'https://docs.google.com/document/d/1OJ0f2DV1ZpnHQO49wSXXuE-rKv_jh6fO/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1OJ0f2DV1ZpnHQO49wSXXuE-rKv_jh6fO');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-12YMvK3iK9C47BpXyErA_PnL8dRD9c6ZP', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '12YMvK3iK9C47BpXyErA_PnL8dRD9c6ZP', 'https://drive.google.com/file/d/12YMvK3iK9C47BpXyErA_PnL8dRD9c6ZP/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '12YMvK3iK9C47BpXyErA_PnL8dRD9c6ZP');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1cEvNhmMaHJl_YFZmt5E52eu5jeyOm8ET', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1cEvNhmMaHJl_YFZmt5E52eu5jeyOm8ET', 'https://docs.google.com/document/d/1cEvNhmMaHJl_YFZmt5E52eu5jeyOm8ET/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1cEvNhmMaHJl_YFZmt5E52eu5jeyOm8ET');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1oPndrkcAZBqmVTg097TbyBK7lwwpoRS3', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1oPndrkcAZBqmVTg097TbyBK7lwwpoRS3', 'https://drive.google.com/file/d/1oPndrkcAZBqmVTg097TbyBK7lwwpoRS3/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1oPndrkcAZBqmVTg097TbyBK7lwwpoRS3');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1EFiIdYsngwJWkCIoSgjKJ8Z8rLS4LoOo', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1EFiIdYsngwJWkCIoSgjKJ8Z8rLS4LoOo', 'https://docs.google.com/document/d/1EFiIdYsngwJWkCIoSgjKJ8Z8rLS4LoOo/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1EFiIdYsngwJWkCIoSgjKJ8Z8rLS4LoOo');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-15X9sp0RbJJU7miLtspMwXgcNyhEO9v-E', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '15X9sp0RbJJU7miLtspMwXgcNyhEO9v-E', 'https://drive.google.com/file/d/15X9sp0RbJJU7miLtspMwXgcNyhEO9v-E/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '15X9sp0RbJJU7miLtspMwXgcNyhEO9v-E');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1MN-n0Yjqx9Rjy1RO89QKk4y_rNTVM01m', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1MN-n0Yjqx9Rjy1RO89QKk4y_rNTVM01m', 'https://docs.google.com/document/d/1MN-n0Yjqx9Rjy1RO89QKk4y_rNTVM01m/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1MN-n0Yjqx9Rjy1RO89QKk4y_rNTVM01m');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1qtvBjQPfvOhkD5uwlvmhPqn6TcFF-9Uu', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1qtvBjQPfvOhkD5uwlvmhPqn6TcFF-9Uu', 'https://drive.google.com/file/d/1qtvBjQPfvOhkD5uwlvmhPqn6TcFF-9Uu/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1qtvBjQPfvOhkD5uwlvmhPqn6TcFF-9Uu');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1xZOsIE8NEdhAUhY0ImTJ0ftmRfToyAk4', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1xZOsIE8NEdhAUhY0ImTJ0ftmRfToyAk4', 'https://docs.google.com/document/d/1xZOsIE8NEdhAUhY0ImTJ0ftmRfToyAk4/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1xZOsIE8NEdhAUhY0ImTJ0ftmRfToyAk4');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1hgO5oNj-husJqRwG76cEIEOlCLM1o2sf', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1hgO5oNj-husJqRwG76cEIEOlCLM1o2sf', 'https://drive.google.com/file/d/1hgO5oNj-husJqRwG76cEIEOlCLM1o2sf/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1hgO5oNj-husJqRwG76cEIEOlCLM1o2sf');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1vWMlmN6JRZ_UpoqNeLtbhbhBGph50OLB', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1vWMlmN6JRZ_UpoqNeLtbhbhBGph50OLB', 'https://docs.google.com/document/d/1vWMlmN6JRZ_UpoqNeLtbhbhBGph50OLB/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1vWMlmN6JRZ_UpoqNeLtbhbhBGph50OLB');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1hHwUihCuLLwTr62L2_1d2Ueh8R7LQYGM', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1hHwUihCuLLwTr62L2_1d2Ueh8R7LQYGM', 'https://drive.google.com/file/d/1hHwUihCuLLwTr62L2_1d2Ueh8R7LQYGM/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1hHwUihCuLLwTr62L2_1d2Ueh8R7LQYGM');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-16wZwNJ1sJOxtySQ2modm7hNvaMSf_Zxj', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '16wZwNJ1sJOxtySQ2modm7hNvaMSf_Zxj', 'https://docs.google.com/document/d/16wZwNJ1sJOxtySQ2modm7hNvaMSf_Zxj/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '16wZwNJ1sJOxtySQ2modm7hNvaMSf_Zxj');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1oGhii6SozoGCaCh7edCuRP-FsvL29EzC', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1oGhii6SozoGCaCh7edCuRP-FsvL29EzC', 'https://drive.google.com/file/d/1oGhii6SozoGCaCh7edCuRP-FsvL29EzC/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1oGhii6SozoGCaCh7edCuRP-FsvL29EzC');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1A6eqJbNPT1nG0nl5HAehIOyF30GfNIRd', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1A6eqJbNPT1nG0nl5HAehIOyF30GfNIRd', 'https://docs.google.com/document/d/1A6eqJbNPT1nG0nl5HAehIOyF30GfNIRd/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1A6eqJbNPT1nG0nl5HAehIOyF30GfNIRd');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1A0wxMjI-xkyat7Tv0w1e53b5V4b9xD7H', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1A0wxMjI-xkyat7Tv0w1e53b5V4b9xD7H', 'https://drive.google.com/file/d/1A0wxMjI-xkyat7Tv0w1e53b5V4b9xD7H/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1A0wxMjI-xkyat7Tv0w1e53b5V4b9xD7H');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1rknhNoo7qvAKRzWissVs9Bcoep2Zfs32', 'Fconstancia.doc', 'application/msword', 46592, 'GDRIVE', '1rknhNoo7qvAKRzWissVs9Bcoep2Zfs32', 'https://docs.google.com/document/d/1rknhNoo7qvAKRzWissVs9Bcoep2Zfs32/edit?usp=drivesdk&ouid=104725373034984418734&rtpof=true&sd=true', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1rknhNoo7qvAKRzWissVs9Bcoep2Zfs32');
INSERT INTO file_resource (checksum_hash, original_name, mime_type, size_bytes, storage_provider, storage_key, storage_url, created_at)
SELECT 'gdrive-seed-1hlWtkIsSEaCjSKGFkACO8_PJpYKHctpM', 'malla_informatica.pdf', 'application/pdf', 78409, 'GDRIVE', '1hlWtkIsSEaCjSKGFkACO8_PJpYKHctpM', 'https://drive.google.com/file/d/1hlWtkIsSEaCjSKGFkACO8_PJpYKHctpM/view?usp=drivesdk', NOW()
WHERE NOT EXISTS (SELECT 1 FROM file_resource WHERE storage_provider = 'GDRIVE' AND storage_key = '1hlWtkIsSEaCjSKGFkACO8_PJpYKHctpM');

-- 5) File versions (v1)

-- 6) Carpetas de materiales (Sesiones + Material adicional)
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 17, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 17 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 17, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 17 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 18, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 18 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 18, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 18 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 19, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 19 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 19, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 19 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 20, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 20 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 20, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 20 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 37, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 37 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 37, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 37 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 38, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 38 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 38, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 38 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 39, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 39 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 39, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 39 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 40, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 40 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 40, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 40 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 57, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 57 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 57, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 57 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 58, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 58 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 58, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 58 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 59, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 59 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 59, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 59 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 60, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 60 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 60, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 60 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 77, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 77 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 77, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 77 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 78, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 78 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 78, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 78 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 79, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 79 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 79, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 79 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 80, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 80 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 80, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 80 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 97, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 97 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 97, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 97 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 98, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 98 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 98, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 98 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 99, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 99 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 99, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 99 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 100, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 100 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 100, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 100 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 117, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 117 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 117, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 117 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 118, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 118 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 118, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 118 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 119, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 119 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 119, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 119 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 120, NULL, @folder_status_active, 'Material adicional', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 120 AND mf.parent_folder_id IS NULL AND mf.name = 'Material adicional'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 120, NULL, @folder_status_active, 'Sesiones', NULL, NULL, 1, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM material_folder mf
  WHERE mf.evaluation_id = 120 AND mf.parent_folder_id IS NULL AND mf.name = 'Sesiones'
);
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 17, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 17 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 17 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 17, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 17 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 17 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 18, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 18 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 18 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 18, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 18 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 18 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 19, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 19 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 19 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 19, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 19 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 19 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 20, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 20 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 20 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 20, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 20 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 20 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 37, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 37 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 37 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 37, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 37 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 37 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 38, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 38 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 38 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 38, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 38 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 38 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 39, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 39 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 39 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 39, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 39 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 39 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 40, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 40 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 40 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 40, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 40 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 40 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 57, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 57 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 57 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 57, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 57 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 57 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 58, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 58 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 58 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 58, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 58 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 58 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 59, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 59 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 59 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 59, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 59 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 59 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 60, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 60 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 60 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 60, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 60 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 60 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 77, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 77 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 77 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 77, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 77 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 77 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 78, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 78 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 78 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 78, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 78 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 78 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 79, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 79 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 79 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 79, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 79 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 79 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 80, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 80 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 80 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 80, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 80 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 80 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 97, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 97 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 97 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 97, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 97 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 97 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 98, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 98 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 98 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 98, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 98 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 98 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 99, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 99 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 99 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 99, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 99 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 99 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 100, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 100 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 100 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 100, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 100 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 100 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 117, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 117 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 117 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 117, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 117 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 117 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 118, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 118 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 118 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 118, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 118 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 118 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 119, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 119 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 119 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 119, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 119 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 119 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 120, root.id, @folder_status_active, 'Enunciados', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 120 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 120 AND mf.parent_folder_id = root.id AND mf.name = 'Enunciados'
  );
INSERT INTO material_folder (evaluation_id, parent_folder_id, folder_status_id, name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT 120, root.id, @folder_status_active, 'Resumenes', NULL, NULL, 1, NOW(), NOW()
FROM material_folder root
WHERE root.evaluation_id = 120 AND root.parent_folder_id IS NULL AND root.name = 'Material adicional'
  AND NOT EXISTS (
    SELECT 1 FROM material_folder mf
    WHERE mf.evaluation_id = 120 AND mf.parent_folder_id = root.id AND mf.name = 'Resumenes'
  );

-- 7) Materiales (sesiones y material adicional)
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT
  mf.id,
  ce.id,
  fr.id,
  NULL,
  @material_status_active,
  CONCAT('Sesion ', ce.session_number, ' - ', fr.original_name),
  NULL,
  NULL,
  1,
  NOW(),
  NOW()
FROM material_folder mf
INNER JOIN class_event ce ON ce.evaluation_id = mf.evaluation_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE'
  AND fr.original_name = CONCAT('1INF61-2026-1-SILABO__ev_', mf.evaluation_id, '.PDF')

WHERE mf.parent_folder_id IS NULL
  AND mf.name = 'Sesiones'
  AND ce.session_number BETWEEN 1 AND 4
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id = ce.id
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1WwBGsVlrBBfSct0hQTyz6N46IlGC0bq9'

WHERE mf.evaluation_id = 17 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );

-- 8) Material versions + current version backfill
INSERT INTO material_version (
  material_id,
  file_resource_id,
  version_number,
  restored_from_material_version_id,
  created_at,
  created_by
)
SELECT
  m.id,
  m.file_resource_id,
  1,
  NULL,
  COALESCE(m.updated_at, m.created_at, NOW()),
  m.created_by
FROM material m
WHERE NOT EXISTS (
  SELECT 1
  FROM material_version mv
  WHERE mv.material_id = m.id
    AND mv.version_number = 1
);

UPDATE material m
INNER JOIN material_version mv
  ON mv.material_id = m.id
 AND mv.version_number = 1
SET m.current_version_id = mv.id
WHERE m.current_version_id IS NULL;
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1HbbEumBCCjeaS5xzogm5vGZB29xZzgMX'

WHERE mf.evaluation_id = 17 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1PtPvS8ecvhholw1Lh6FvoD5QGmqq-Kqo'

WHERE mf.evaluation_id = 18 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1uTkkdHAc86dDFdy75SUPeGZZc4N2FIb7'

WHERE mf.evaluation_id = 18 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1KHW-Jb-zXlOItZfvdiOlF4VYZ_zkLeaR'

WHERE mf.evaluation_id = 19 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1IxATftwfdn77ejslRMM97JsFe3y2Idtt'

WHERE mf.evaluation_id = 19 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1G6BKx0gj9mFC9Jf_AkyZynMhcim1LZKg'

WHERE mf.evaluation_id = 20 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Znjj_3cao8oX9dGT8l7N9W7WNcyN4oyy'

WHERE mf.evaluation_id = 20 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MlALOYgamI6m87oUMNT9kYEuXz7NM05U'

WHERE mf.evaluation_id = 37 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rl11bF3mj7Yh2qnFhECCJkIxODotclRA'

WHERE mf.evaluation_id = 37 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ieOLbKJVcwyerEbjSQPsI7HAmkyuYFB2'

WHERE mf.evaluation_id = 38 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1gohb7IoErtwtpgDuYtzLyCTXY0ogOEDo'

WHERE mf.evaluation_id = 38 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ATRszqqODvJSEIrQu1aeLX5GFSmfPrSf'

WHERE mf.evaluation_id = 39 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1iE0rIqb4ILSk-NWtC-JKiMRv-ICM-nj5'

WHERE mf.evaluation_id = 39 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1axSADderCbGH6Gcec7t5EZwSnWDsb3vf'

WHERE mf.evaluation_id = 40 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '11bxBh8F9Qgz5FKbI2gQocwaK20XwWXw_'

WHERE mf.evaluation_id = 40 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Ahuar298z-ghOjGH5_VXg4zv-7ae0dbh'

WHERE mf.evaluation_id = 57 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1e-1zASB9V7M5MGstIsWAIsiuoVJ0w49g'

WHERE mf.evaluation_id = 57 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15EaGkROfLUstamUD0yi51Te6QVFmyFQM'

WHERE mf.evaluation_id = 58 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1sEIH8xgZecj-cBfCWAQ7z45fbi01XW4f'

WHERE mf.evaluation_id = 58 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1yrpsS37Xh6QqCwdfyD5NEKlpiHtAKX1a'

WHERE mf.evaluation_id = 59 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1aadszK56LMsKnDDvQjrLpT-Bt61D8Ao_'

WHERE mf.evaluation_id = 59 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1QbqnLF8WMyOzvUdGTz-YbnW0XVF3qIy6'

WHERE mf.evaluation_id = 60 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1qxmu1KE25PLwTx6GAeA52Is4HrqqQkx4'

WHERE mf.evaluation_id = 60 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1GR0ucgSxXfbRxwzcUdbcAtVWB_eBW1bJ'

WHERE mf.evaluation_id = 77 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1cSPfOcZRaBOWkyWUdb-88UhKRbN0PeJq'

WHERE mf.evaluation_id = 77 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1-LS4b3Dymgd8qxdh4WJSHjLk0P-G2LPK'

WHERE mf.evaluation_id = 78 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1JhbfILUb_9PX2C3ebsVmQCPWIjDEckb1'

WHERE mf.evaluation_id = 78 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1tPxXLm9ogNt1ZhNiqWcy1VCaukooB3qa'

WHERE mf.evaluation_id = 79 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Tv24MmDdpJ-VOkh51c1CMk7UOi3G6393'

WHERE mf.evaluation_id = 79 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1AqnrDPZYRj6G-q4E2X8WxbYDN2yvLhle'

WHERE mf.evaluation_id = 80 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1czeTuR2huO8lhj8cxNNSq3mTLllwrch6'

WHERE mf.evaluation_id = 80 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1iLovA-k1FgkuzrcPtRSReJoOwxh2oEWW'

WHERE mf.evaluation_id = 97 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1f02AmOXIuiVHBo3bq1s7mqJLvv5JU3Jj'

WHERE mf.evaluation_id = 97 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1xolEpP_9C7diH-Ngb6tj2BR3tU7aGlLl'

WHERE mf.evaluation_id = 98 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1BmjmXCEdCLbK-c0nU7vPAfGpZ3TKz7Vh'

WHERE mf.evaluation_id = 98 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1VDOuu9BC2dr1n4ub0_H2lCbc_ShTVk82'

WHERE mf.evaluation_id = 99 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Wz-oBiLcaWT3pN7CDCTLR7dGAUeGno8L'

WHERE mf.evaluation_id = 99 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1YIUpS97LvLzN1erWtzfkSkkJrw700SvG'

WHERE mf.evaluation_id = 100 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1FNSwSQCwcuoTc0XVCs2KuX1HPr0FWqRl'

WHERE mf.evaluation_id = 100 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rZkeki8LR8kPy4rLEIosX19qVrfSl12v'

WHERE mf.evaluation_id = 117 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15mTVQ3-zh9xBCHlo0UPtlixeYFikfRI6'

WHERE mf.evaluation_id = 117 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1IrlZwkc9j07mKXSP1TDi0qMCrJqTdZCd'

WHERE mf.evaluation_id = 118 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rR0dOCbyKN0sq__bC3NW6qO0-g4fF04i'

WHERE mf.evaluation_id = 118 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1GolyxlvXx6Ex6urzXiNsAD_HLdm_BlQM'

WHERE mf.evaluation_id = 119 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1cW7pCOMxcOnvQYapgE-fSpDoRc8CPDj_'

WHERE mf.evaluation_id = 119 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Desarrollo de un videojuego educativo configurable con mecánicas de aprendizaje y de juego que.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1a-6PBpxDbSAGBNj70lOPtTzehs1Zrqu9'

WHERE mf.evaluation_id = 120 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, '1INF26-Plantilla_E2.docx', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1zpHe-mVBdv25z0Bm5DiH7aqe9zF9Mk3Q'

WHERE mf.evaluation_id = 120 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1G9vzGUgf02XVfZzIzIvNEyqvoDgTu4vS'

WHERE mf.evaluation_id = 17 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1fTNUI87Wgy0tbIrMw4YzTsDh9LBAvu6b'

WHERE mf.evaluation_id = 17 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1aSQdSPPbvVR9dNoRKlbuF723gO2qjgXU'

WHERE mf.evaluation_id = 18 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ZrSccpKoyZjM5NCdCXdgsRObqlxQIFrY'

WHERE mf.evaluation_id = 18 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1EV7hoUtrchbCY231QhY0J0vwv_MrFSDg'

WHERE mf.evaluation_id = 19 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1ObBdxEb-SLnESx6j2UDQvw1AQqqjtCPt'

WHERE mf.evaluation_id = 19 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hL1y3oXkoR9OcOUzeMNznYYxetfF1mCB'

WHERE mf.evaluation_id = 20 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1Yu185-8amxaFPRy8B0OTnOz1Wv8GmJI-'

WHERE mf.evaluation_id = 20 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1_3-mSiOJl7YwOgw4iFpuGXGSw3saHRhx'

WHERE mf.evaluation_id = 37 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1bRoh3Hp82UvhsqVdVgnN4nze0AutvVOT'

WHERE mf.evaluation_id = 37 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1mWu90No-8YzIsqyQ33NnAGDPk9hQkao8'

WHERE mf.evaluation_id = 38 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1dh2_fk3jch7R2ScIRcgognkNhOMCQ5ct'

WHERE mf.evaluation_id = 38 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1oRC7L2ZtBAmi_KyjxcUrYrv4AAwimlfl'

WHERE mf.evaluation_id = 39 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1EQl68bYScvP_OxCukAc3pF5ajBHH_yjm'

WHERE mf.evaluation_id = 39 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1-BHHD6LDZ7sSGaPyKklXHCBEEZeDyu_X'

WHERE mf.evaluation_id = 40 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1q01IuyC44xnWvjrnv4D0pM6ye0Umw1uE'

WHERE mf.evaluation_id = 40 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1S-0qagQ7Mx7MHIxH2InHIkpRq3rgBtMB'

WHERE mf.evaluation_id = 57 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rqBwH1Xr-rhL5-9Pp_bMsI-NMKpafhCc'

WHERE mf.evaluation_id = 57 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1uZK4YMSixKgR79rEF-eLSvk4PW_IAUh8'

WHERE mf.evaluation_id = 58 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1PBFTrE_Jz5v9f1Z9gm1fpY65w323Zdxl'

WHERE mf.evaluation_id = 58 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1IJPpLMJodUiBjOEVcJx00OlL45BqWF1m'

WHERE mf.evaluation_id = 59 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '18jySXno0g8l8EvPi4Te68pU7f5ewjw7V'

WHERE mf.evaluation_id = 59 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1h3CEHcBAQkKVqiQx7aG7ziXxDOnWrhhy'

WHERE mf.evaluation_id = 60 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '18axkx7ikPla3uJv2XqCI6y5vuR7hU0oI'

WHERE mf.evaluation_id = 60 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1IYGYgFHJtvuIdGaqz8nftEyVsNLpnAxX'

WHERE mf.evaluation_id = 77 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '10bWkRUJI7RaMmxy-FVyJPIHl0nE2ABk8'

WHERE mf.evaluation_id = 77 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1VIBhqgT1YA9sRU6vtmzdX5gD-UUlnoax'

WHERE mf.evaluation_id = 78 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1OfvkqnM2V-bC5G0N059ZCDbRLbf2atCK'

WHERE mf.evaluation_id = 78 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '11hNB3qBHIMqhLQEY0gKmD1cNe0qNKR7G'

WHERE mf.evaluation_id = 79 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1cndWa9mWEa4wy5iKfNjslX6XWKCvJkxf'

WHERE mf.evaluation_id = 79 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1OJ0f2DV1ZpnHQO49wSXXuE-rKv_jh6fO'

WHERE mf.evaluation_id = 80 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '12YMvK3iK9C47BpXyErA_PnL8dRD9c6ZP'

WHERE mf.evaluation_id = 80 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1cEvNhmMaHJl_YFZmt5E52eu5jeyOm8ET'

WHERE mf.evaluation_id = 97 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1oPndrkcAZBqmVTg097TbyBK7lwwpoRS3'

WHERE mf.evaluation_id = 97 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1EFiIdYsngwJWkCIoSgjKJ8Z8rLS4LoOo'

WHERE mf.evaluation_id = 98 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '15X9sp0RbJJU7miLtspMwXgcNyhEO9v-E'

WHERE mf.evaluation_id = 98 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1MN-n0Yjqx9Rjy1RO89QKk4y_rNTVM01m'

WHERE mf.evaluation_id = 99 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1qtvBjQPfvOhkD5uwlvmhPqn6TcFF-9Uu'

WHERE mf.evaluation_id = 99 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1xZOsIE8NEdhAUhY0ImTJ0ftmRfToyAk4'

WHERE mf.evaluation_id = 100 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hgO5oNj-husJqRwG76cEIEOlCLM1o2sf'

WHERE mf.evaluation_id = 100 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1vWMlmN6JRZ_UpoqNeLtbhbhBGph50OLB'

WHERE mf.evaluation_id = 117 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hHwUihCuLLwTr62L2_1d2Ueh8R7LQYGM'

WHERE mf.evaluation_id = 117 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '16wZwNJ1sJOxtySQ2modm7hNvaMSf_Zxj'

WHERE mf.evaluation_id = 118 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1oGhii6SozoGCaCh7edCuRP-FsvL29EzC'

WHERE mf.evaluation_id = 118 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1A6eqJbNPT1nG0nl5HAehIOyF30GfNIRd'

WHERE mf.evaluation_id = 119 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1A0wxMjI-xkyat7Tv0w1e53b5V4b9xD7H'

WHERE mf.evaluation_id = 119 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'Fconstancia.doc', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1rknhNoo7qvAKRzWissVs9Bcoep2Zfs32'

WHERE mf.evaluation_id = 120 AND root.name = 'Material adicional' AND mf.name = 'Resumenes'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
INSERT INTO material (material_folder_id, class_event_id, file_resource_id, current_version_id, material_status_id, display_name, visible_from, visible_until, created_by, created_at, updated_at)
SELECT mf.id, NULL, fr.id, NULL, @material_status_active, 'malla_informatica.pdf', NULL, NULL, 1, NOW(), NOW()
FROM material_folder mf
INNER JOIN material_folder root ON root.id = mf.parent_folder_id
INNER JOIN file_resource fr ON fr.storage_provider = 'GDRIVE' AND fr.storage_key = '1hlWtkIsSEaCjSKGFkACO8_PJpYKHctpM'

WHERE mf.evaluation_id = 120 AND root.name = 'Material adicional' AND mf.name = 'Enunciados'
  AND NOT EXISTS (
    SELECT 1 FROM material mx
    WHERE mx.material_folder_id = mf.id
      AND mx.file_resource_id = fr.id
      AND mx.class_event_id IS NULL
  );
