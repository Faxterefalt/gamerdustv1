/*
 Navicat Premium Data Transfer

 Source Server         : localhost_3306
 Source Server Type    : MySQL
 Source Server Version : 80403
 Source Host           : localhost:3306
 Source Schema         : gamerdust

 Target Server Type    : MySQL
 Target Server Version : 80403
 File Encoding         : 65001

 Date: 25/11/2026 16:05:44
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for ai_feedback
-- ----------------------------
DROP TABLE IF EXISTS `ai_feedback`;
CREATE TABLE `ai_feedback`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `ai_generation_id` bigint UNSIGNED NULL DEFAULT NULL,
  `emotional_analysis_id` bigint UNSIGNED NULL DEFAULT NULL,
  `item_index` smallint UNSIGNED NOT NULL DEFAULT 0,
  `useful` tinyint(1) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ai_feedback_project_id_foreign`(`project_id` ASC) USING BTREE,
  INDEX `ai_feedback_user_id_foreign`(`user_id` ASC) USING BTREE,
  INDEX `ai_feedback_emotional_analysis_id_user_id_index`(`emotional_analysis_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `ai_feedback_ai_generation_id_user_id_index`(`ai_generation_id` ASC, `user_id` ASC) USING BTREE,
  CONSTRAINT `ai_feedback_ai_generation_id_foreign` FOREIGN KEY (`ai_generation_id`) REFERENCES `ai_generations` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `ai_feedback_emotional_analysis_id_foreign` FOREIGN KEY (`emotional_analysis_id`) REFERENCES `emotional_analyses` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `ai_feedback_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `ai_feedback_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for ai_generations
-- ----------------------------
DROP TABLE IF EXISTS `ai_generations`;
CREATE TABLE `ai_generations`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `generation_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `response` json NULL,
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ok',
  `prompt_tokens` int UNSIGNED NULL DEFAULT NULL,
  `completion_tokens` int UNSIGNED NULL DEFAULT NULL,
  `total_tokens` int UNSIGNED NULL DEFAULT NULL,
  `latency_ms` int UNSIGNED NULL DEFAULT NULL,
  `input_hash` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `error` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `ai_generations_project_id_foreign`(`project_id` ASC) USING BTREE,
  INDEX `ai_generations_user_id_foreign`(`user_id` ASC) USING BTREE,
  INDEX `ai_generations_generation_type_index`(`generation_type` ASC) USING BTREE,
  INDEX `ai_generations_status_index`(`status` ASC) USING BTREE,
  INDEX `ai_generations_input_hash_index`(`input_hash` ASC) USING BTREE,
  CONSTRAINT `ai_generations_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `ai_generations_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for branching_variables
-- ----------------------------
DROP TABLE IF EXISTS `branching_variables`;
CREATE TABLE `branching_variables`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `key` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `initial_value` json NOT NULL,
  `description` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `branching_variables_project_id_key_unique`(`project_id` ASC, `key` ASC) USING BTREE,
  CONSTRAINT `branching_variables_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cache
-- ----------------------------
DROP TABLE IF EXISTS `cache`;
CREATE TABLE `cache`  (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`) USING BTREE,
  INDEX `cache_expiration_index`(`expiration` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cache_locks
-- ----------------------------
DROP TABLE IF EXISTS `cache_locks`;
CREATE TABLE `cache_locks`  (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` bigint NOT NULL,
  PRIMARY KEY (`key`) USING BTREE,
  INDEX `cache_locks_expiration_index`(`expiration` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for character_emotional_states
-- ----------------------------
DROP TABLE IF EXISTS `character_emotional_states`;
CREATE TABLE `character_emotional_states`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `character_id` bigint UNSIGNED NOT NULL,
  `scene_id` bigint UNSIGNED NOT NULL,
  `emotional_analysis_id` bigint UNSIGNED NOT NULL,
  `v` decimal(4, 3) NOT NULL,
  `a` decimal(4, 3) NOT NULL,
  `d` decimal(4, 3) NOT NULL,
  `emotion` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `evidence` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `abrupt_change` tinyint(1) NOT NULL DEFAULT 0,
  `change_justified` tinyint(1) NULL DEFAULT NULL,
  `change_explanation` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `out_of_character` tinyint(1) NOT NULL DEFAULT 0,
  `out_of_character_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `character_emotional_states_scene_id_character_id_unique`(`scene_id` ASC, `character_id` ASC) USING BTREE,
  INDEX `character_emotional_states_project_id_foreign`(`project_id` ASC) USING BTREE,
  INDEX `character_emotional_states_character_id_foreign`(`character_id` ASC) USING BTREE,
  INDEX `character_emotional_states_emotional_analysis_id_foreign`(`emotional_analysis_id` ASC) USING BTREE,
  CONSTRAINT `character_emotional_states_character_id_foreign` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `character_emotional_states_emotional_analysis_id_foreign` FOREIGN KEY (`emotional_analysis_id`) REFERENCES `emotional_analyses` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `character_emotional_states_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `character_emotional_states_scene_id_foreign` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for character_lore_entry
-- ----------------------------
DROP TABLE IF EXISTS `character_lore_entry`;
CREATE TABLE `character_lore_entry`  (
  `lore_entry_id` bigint UNSIGNED NOT NULL,
  `character_id` bigint UNSIGNED NOT NULL,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  PRIMARY KEY (`lore_entry_id`, `character_id`) USING BTREE,
  INDEX `character_lore_entry_character_id_foreign`(`character_id` ASC) USING BTREE,
  CONSTRAINT `character_lore_entry_character_id_foreign` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `character_lore_entry_lore_entry_id_foreign` FOREIGN KEY (`lore_entry_id`) REFERENCES `lore_entries` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for character_scene
-- ----------------------------
DROP TABLE IF EXISTS `character_scene`;
CREATE TABLE `character_scene`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `scene_id` bigint UNSIGNED NOT NULL,
  `character_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `character_scene_scene_id_character_id_unique`(`scene_id` ASC, `character_id` ASC) USING BTREE,
  INDEX `character_scene_character_id_foreign`(`character_id` ASC) USING BTREE,
  CONSTRAINT `character_scene_character_id_foreign` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `character_scene_scene_id_foreign` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for characters
-- ----------------------------
DROP TABLE IF EXISTS `characters`;
CREATE TABLE `characters`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `archetype` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `age` int UNSIGNED NULL DEFAULT NULL,
  `gender` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `background` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `personality` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `speech_style` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `motivation` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `values` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `inner_conflict` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `fear` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `desire` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `emotional_arc` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `initial_emotion` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `initial_intensity` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `visual_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `voice_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `limits` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `image_path` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `characters_project_id_foreign`(`project_id` ASC) USING BTREE,
  CONSTRAINT `characters_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for comments
-- ----------------------------
DROP TABLE IF EXISTS `comments`;
CREATE TABLE `comments`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `scene_id` bigint UNSIGNED NULL DEFAULT NULL,
  `user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `comments_project_id_foreign`(`project_id` ASC) USING BTREE,
  INDEX `comments_scene_id_foreign`(`scene_id` ASC) USING BTREE,
  INDEX `comments_user_id_foreign`(`user_id` ASC) USING BTREE,
  CONSTRAINT `comments_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `comments_scene_id_foreign` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `comments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 6 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for cost_estimations
-- ----------------------------
DROP TABLE IF EXISTS `cost_estimations`;
CREATE TABLE `cost_estimations`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `costable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `costable_id` bigint UNSIGNED NULL DEFAULT NULL,
  `cost_level` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'low',
  `cost_score` int UNSIGNED NOT NULL DEFAULT 1,
  `cost_factors` json NULL,
  `explanation` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `cost_estimations_project_id_foreign`(`project_id` ASC) USING BTREE,
  INDEX `cost_estimations_costable_type_costable_id_index`(`costable_type` ASC, `costable_id` ASC) USING BTREE,
  CONSTRAINT `cost_estimations_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 19 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for dialogue_node_lore_entry
-- ----------------------------
DROP TABLE IF EXISTS `dialogue_node_lore_entry`;
CREATE TABLE `dialogue_node_lore_entry`  (
  `dialogue_node_id` bigint UNSIGNED NOT NULL,
  `lore_entry_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`dialogue_node_id`, `lore_entry_id`) USING BTREE,
  INDEX `dialogue_node_lore_entry_lore_entry_id_foreign`(`lore_entry_id` ASC) USING BTREE,
  CONSTRAINT `dialogue_node_lore_entry_dialogue_node_id_foreign` FOREIGN KEY (`dialogue_node_id`) REFERENCES `dialogue_nodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `dialogue_node_lore_entry_lore_entry_id_foreign` FOREIGN KEY (`lore_entry_id`) REFERENCES `lore_entries` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for dialogue_nodes
-- ----------------------------
DROP TABLE IF EXISTS `dialogue_nodes`;
CREATE TABLE `dialogue_nodes`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `scene_id` bigint UNSIGNED NULL DEFAULT NULL,
  `character_id` bigint UNSIGNED NULL DEFAULT NULL,
  `node_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `dialogue_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ambient',
  `text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `emotional_tone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `trigger_condition` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `is_start` tinyint(1) NOT NULL DEFAULT 0,
  `is_ending` tinyint(1) NOT NULL DEFAULT 0,
  `pos_x` double NULL DEFAULT NULL,
  `pos_y` double NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `dialogue_nodes_project_id_node_key_unique`(`project_id` ASC, `node_key` ASC) USING BTREE,
  INDEX `dialogue_nodes_scene_id_foreign`(`scene_id` ASC) USING BTREE,
  INDEX `dialogue_nodes_character_id_foreign`(`character_id` ASC) USING BTREE,
  INDEX `dialogue_nodes_dialogue_type_index`(`dialogue_type` ASC) USING BTREE,
  CONSTRAINT `dialogue_nodes_character_id_foreign` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `dialogue_nodes_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `dialogue_nodes_scene_id_foreign` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 17 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for dialogue_options
-- ----------------------------
DROP TABLE IF EXISTS `dialogue_options`;
CREATE TABLE `dialogue_options`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `dialogue_node_id` bigint UNSIGNED NOT NULL,
  `next_dialogue_node_id` bigint UNSIGNED NULL DEFAULT NULL,
  `player_option` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `consequence` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `required_condition` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `condition` json NULL,
  `effects` json NULL,
  `source_ref` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `dialogue_options_node_source_ref_unique`(`dialogue_node_id` ASC, `source_ref` ASC) USING BTREE,
  INDEX `dialogue_options_next_dialogue_node_id_foreign`(`next_dialogue_node_id` ASC) USING BTREE,
  CONSTRAINT `dialogue_options_dialogue_node_id_foreign` FOREIGN KEY (`dialogue_node_id`) REFERENCES `dialogue_nodes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `dialogue_options_next_dialogue_node_id_foreign` FOREIGN KEY (`next_dialogue_node_id`) REFERENCES `dialogue_nodes` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 26 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for edit_locks
-- ----------------------------
DROP TABLE IF EXISTS `edit_locks`;
CREATE TABLE `edit_locks`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `lockable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `lockable_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `expires_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `edit_locks_lockable_type_lockable_id_unique`(`lockable_type` ASC, `lockable_id` ASC) USING BTREE,
  INDEX `edit_locks_project_id_foreign`(`project_id` ASC) USING BTREE,
  INDEX `edit_locks_user_id_foreign`(`user_id` ASC) USING BTREE,
  INDEX `edit_locks_expires_at_index`(`expires_at` ASC) USING BTREE,
  CONSTRAINT `edit_locks_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `edit_locks_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for emotional_analyses
-- ----------------------------
DROP TABLE IF EXISTS `emotional_analyses`;
CREATE TABLE `emotional_analyses`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `analyzable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `analyzable_id` bigint UNSIGNED NULL DEFAULT NULL,
  `source` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `model` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `content_hash` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `input_text` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `dominant_emotion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `valence` decimal(5, 2) NULL DEFAULT NULL,
  `arousal` decimal(5, 2) NULL DEFAULT NULL,
  `dominance` decimal(5, 2) NULL DEFAULT NULL,
  `emotion_scores` json NULL,
  `interpretation` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `suggestions` json NULL,
  `result` json NULL,
  `truncated` tinyint(1) NOT NULL DEFAULT 0,
  `degraded` tinyint(1) NOT NULL DEFAULT 0,
  `scene_version_id` bigint UNSIGNED NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `emotional_analyses_project_id_foreign`(`project_id` ASC) USING BTREE,
  INDEX `emotional_analyses_analyzable_type_analyzable_id_index`(`analyzable_type` ASC, `analyzable_id` ASC) USING BTREE,
  INDEX `emotional_analyses_scene_version_id_foreign`(`scene_version_id` ASC) USING BTREE,
  INDEX `emotional_analyses_content_hash_index`(`content_hash` ASC) USING BTREE,
  CONSTRAINT `emotional_analyses_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `emotional_analyses_scene_version_id_foreign` FOREIGN KEY (`scene_version_id`) REFERENCES `scene_versions` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for failed_jobs
-- ----------------------------
DROP TABLE IF EXISTS `failed_jobs`;
CREATE TABLE `failed_jobs`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `failed_jobs_uuid_unique`(`uuid` ASC) USING BTREE,
  INDEX `failed_jobs_connection_queue_failed_at_index`(`connection` ASC, `queue` ASC, `failed_at` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for job_batches
-- ----------------------------
DROP TABLE IF EXISTS `job_batches`;
CREATE TABLE `job_batches`  (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `cancelled_at` int NULL DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for jobs
-- ----------------------------
DROP TABLE IF EXISTS `jobs`;
CREATE TABLE `jobs`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` smallint UNSIGNED NOT NULL,
  `reserved_at` int UNSIGNED NULL DEFAULT NULL,
  `available_at` int UNSIGNED NOT NULL,
  `created_at` int UNSIGNED NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `jobs_queue_index`(`queue` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for lore_entries
-- ----------------------------
DROP TABLE IF EXISTS `lore_entries`;
CREATE TABLE `lore_entries`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'concept',
  `subtype` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `parent_id` bigint UNSIGNED NULL DEFAULT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `narrative_function` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `emotional_tone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `access` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `statement` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `rigidity` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `scope` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `origin` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `consequence` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `exceptions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `lore_entries_project_id_foreign`(`project_id` ASC) USING BTREE,
  INDEX `lore_entries_type_index`(`type` ASC) USING BTREE,
  INDEX `lore_entries_parent_id_foreign`(`parent_id` ASC) USING BTREE,
  CONSTRAINT `lore_entries_parent_id_foreign` FOREIGN KEY (`parent_id`) REFERENCES `lore_entries` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `lore_entries_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 12 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for lore_entry_links
-- ----------------------------
DROP TABLE IF EXISTS `lore_entry_links`;
CREATE TABLE `lore_entry_links`  (
  `lore_entry_id` bigint UNSIGNED NOT NULL,
  `linked_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`lore_entry_id`, `linked_id`) USING BTREE,
  INDEX `lore_entry_links_linked_id_foreign`(`linked_id` ASC) USING BTREE,
  CONSTRAINT `lore_entry_links_linked_id_foreign` FOREIGN KEY (`linked_id`) REFERENCES `lore_entries` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `lore_entry_links_lore_entry_id_foreign` FOREIGN KEY (`lore_entry_id`) REFERENCES `lore_entries` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for lore_entry_mechanic
-- ----------------------------
DROP TABLE IF EXISTS `lore_entry_mechanic`;
CREATE TABLE `lore_entry_mechanic`  (
  `lore_entry_id` bigint UNSIGNED NOT NULL,
  `mechanic_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`lore_entry_id`, `mechanic_id`) USING BTREE,
  INDEX `lore_entry_mechanic_mechanic_id_foreign`(`mechanic_id` ASC) USING BTREE,
  CONSTRAINT `lore_entry_mechanic_lore_entry_id_foreign` FOREIGN KEY (`lore_entry_id`) REFERENCES `lore_entries` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `lore_entry_mechanic_mechanic_id_foreign` FOREIGN KEY (`mechanic_id`) REFERENCES `mechanics` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for lore_entry_scene
-- ----------------------------
DROP TABLE IF EXISTS `lore_entry_scene`;
CREATE TABLE `lore_entry_scene`  (
  `lore_entry_id` bigint UNSIGNED NOT NULL,
  `scene_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`lore_entry_id`, `scene_id`) USING BTREE,
  INDEX `lore_entry_scene_scene_id_foreign`(`scene_id` ASC) USING BTREE,
  CONSTRAINT `lore_entry_scene_lore_entry_id_foreign` FOREIGN KEY (`lore_entry_id`) REFERENCES `lore_entries` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `lore_entry_scene_scene_id_foreign` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for mechanic_character
-- ----------------------------
DROP TABLE IF EXISTS `mechanic_character`;
CREATE TABLE `mechanic_character`  (
  `mechanic_id` bigint UNSIGNED NOT NULL,
  `character_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`mechanic_id`, `character_id`) USING BTREE,
  INDEX `mechanic_character_character_id_foreign`(`character_id` ASC) USING BTREE,
  CONSTRAINT `mechanic_character_character_id_foreign` FOREIGN KEY (`character_id`) REFERENCES `characters` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `mechanic_character_mechanic_id_foreign` FOREIGN KEY (`mechanic_id`) REFERENCES `mechanics` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for mechanic_scene
-- ----------------------------
DROP TABLE IF EXISTS `mechanic_scene`;
CREATE TABLE `mechanic_scene`  (
  `mechanic_id` bigint UNSIGNED NOT NULL,
  `scene_id` bigint UNSIGNED NOT NULL,
  PRIMARY KEY (`mechanic_id`, `scene_id`) USING BTREE,
  INDEX `mechanic_scene_scene_id_foreign`(`scene_id` ASC) USING BTREE,
  CONSTRAINT `mechanic_scene_mechanic_id_foreign` FOREIGN KEY (`mechanic_id`) REFERENCES `mechanics` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `mechanic_scene_scene_id_foreign` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for mechanics
-- ----------------------------
DROP TABLE IF EXISTS `mechanics`;
CREATE TABLE `mechanics`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `title` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `icon` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'footsteps',
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `activation` varchar(300) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `narrative_effect` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `playable_actions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `restrictions` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `conflict` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `mechanics_project_id_foreign`(`project_id` ASC) USING BTREE,
  CONSTRAINT `mechanics_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for migrations
-- ----------------------------
DROP TABLE IF EXISTS `migrations`;
CREATE TABLE `migrations`  (
  `id` int UNSIGNED NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 21 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for narrative_validations
-- ----------------------------
DROP TABLE IF EXISTS `narrative_validations`;
CREATE TABLE `narrative_validations`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `validation_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'low',
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `recommendation` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `status` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `fingerprint` char(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `subject_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `subject_id` bigint UNSIGNED NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `narrative_validations_project_id_foreign`(`project_id` ASC) USING BTREE,
  INDEX `narrative_validations_validation_type_index`(`validation_type` ASC) USING BTREE,
  INDEX `narrative_validations_severity_index`(`severity` ASC) USING BTREE,
  INDEX `narrative_validations_subject_type_subject_id_index`(`subject_type` ASC, `subject_id` ASC) USING BTREE,
  INDEX `narrative_validations_status_index`(`status` ASC) USING BTREE,
  INDEX `narrative_validations_fingerprint_index`(`fingerprint` ASC) USING BTREE,
  CONSTRAINT `narrative_validations_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for password_reset_tokens
-- ----------------------------
DROP TABLE IF EXISTS `password_reset_tokens`;
CREATE TABLE `password_reset_tokens`  (
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for project_constraints
-- ----------------------------
DROP TABLE IF EXISTS `project_constraints`;
CREATE TABLE `project_constraints`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `main_emotional_tone` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `dominant_emotion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `secondary_emotions` json NULL,
  `world_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `player_role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `branching_level` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `required_elements` json NULL,
  `forbidden_elements` json NULL,
  `creative_notes` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `narrative_genre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `central_theme` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `setting` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `player_objective` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `expected_outcome` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `assignment` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `max_characters` int UNSIGNED NULL DEFAULT NULL,
  `max_pages` int UNSIGNED NULL DEFAULT NULL,
  `max_budget` decimal(10, 2) NULL DEFAULT NULL,
  `requires_twist` tinyint(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `project_constraints_project_id_unique`(`project_id` ASC) USING BTREE,
  CONSTRAINT `project_constraints_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for project_members
-- ----------------------------
DROP TABLE IF EXISTS `project_members`;
CREATE TABLE `project_members`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `role` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `favorite` tinyint(1) NOT NULL DEFAULT 0,
  `invited_by` bigint UNSIGNED NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `project_members_project_id_user_id_unique`(`project_id` ASC, `user_id` ASC) USING BTREE,
  INDEX `project_members_invited_by_foreign`(`invited_by` ASC) USING BTREE,
  INDEX `project_members_user_id_index`(`user_id` ASC) USING BTREE,
  CONSTRAINT `project_members_invited_by_foreign` FOREIGN KEY (`invited_by`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `project_members_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `project_members_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for projects
-- ----------------------------
DROP TABLE IF EXISTS `projects`;
CREATE TABLE `projects`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` bigint UNSIGNED NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `game_genre` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `language` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'es',
  `narrative_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'balanced',
  `branching_enabled` tinyint(1) NOT NULL DEFAULT 1,
  `premise` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `central_conflict` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `target_audience` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `favorite` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `projects_user_id_foreign`(`user_id` ASC) USING BTREE,
  INDEX `projects_status_index`(`status` ASC) USING BTREE,
  CONSTRAINT `projects_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for scene_versions
-- ----------------------------
DROP TABLE IF EXISTS `scene_versions`;
CREATE TABLE `scene_versions`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `scene_id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `script` json NOT NULL,
  `character_ids` json NOT NULL,
  `location_id` bigint UNSIGNED NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `scene_versions_scene_id_foreign`(`scene_id` ASC) USING BTREE,
  INDEX `scene_versions_user_id_foreign`(`user_id` ASC) USING BTREE,
  CONSTRAINT `scene_versions_scene_id_foreign` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT,
  CONSTRAINT `scene_versions_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 9 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for scenes
-- ----------------------------
DROP TABLE IF EXISTS `scenes`;
CREATE TABLE `scenes`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` bigint UNSIGNED NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `act` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `order` int UNSIGNED NOT NULL DEFAULT 1,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `conflict` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `expected_emotion` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `interest_level` tinyint UNSIGNED NULL DEFAULT NULL,
  `scene_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `player_decision` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `consequence` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `script` json NULL,
  `location_id` bigint UNSIGNED NULL DEFAULT NULL,
  `estimated_cost` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `scenes_project_id_order_index`(`project_id` ASC, `order` ASC) USING BTREE,
  INDEX `scenes_location_id_foreign`(`location_id` ASC) USING BTREE,
  CONSTRAINT `scenes_location_id_foreign` FOREIGN KEY (`location_id`) REFERENCES `lore_entries` (`id`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `scenes_project_id_foreign` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB AUTO_INCREMENT = 4 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for sessions
-- ----------------------------
DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions`  (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint UNSIGNED NULL DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `sessions_user_id_index`(`user_id` ASC) USING BTREE,
  INDEX `sessions_last_activity_index`(`last_activity` ASC) USING BTREE
) ENGINE = InnoDB CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `users_email_unique`(`email` ASC) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 3 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

SET FOREIGN_KEY_CHECKS = 1;
