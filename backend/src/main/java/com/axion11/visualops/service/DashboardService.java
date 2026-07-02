package com.axion11.visualops.service;

import com.axion11.visualops.models.Batch;
import com.axion11.visualops.models.ImageUpload;
import com.axion11.visualops.repository.BatchRepository;
import com.axion11.visualops.repository.ImageUploadRepository;
import com.axion11.visualops.repository.ProjectRepository;
import com.axion11.visualops.models.dto.DashboardBatch;
import com.axion11.visualops.models.dto.DashboardStats;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DashboardService {

        private final ProjectRepository projectRepository;
        private final BatchRepository batchRepository;
        private final ImageUploadRepository imageUploadRepository;

        @Transactional(readOnly = true)
        public DashboardStats getSummaryStats() {
                long totalProjects = projectRepository.count();
                long totalAssets = imageUploadRepository.count();

                long approvedAssets = imageUploadRepository.findAll().stream()
                                .filter(a -> "approved".equalsIgnoreCase(a.getApprovalStatus())).count();
                long pendingReview = imageUploadRepository.findAll().stream()
                                .filter(a -> a.getApprovalStatus() == null || "pending".equalsIgnoreCase(a.getApprovalStatus())).count();
                long rejectedAssets = imageUploadRepository.findAll().stream()
                                .filter(a -> "rejected".equalsIgnoreCase(a.getApprovalStatus())).count();

                return DashboardStats.builder()
                                .totalProjects((int) totalProjects)
                                .totalAssets((int) totalAssets)
                                .approvedAssets((int) approvedAssets)
                                .pendingReview((int) pendingReview)
                                .rejectedAssets((int) rejectedAssets)
                                .build();
        }

        @Transactional(readOnly = true)
        public List<DashboardBatch> getBatches() {
                return batchRepository.findAllByOrderByIdAsc().stream()
                                .map(this::mapToDashboardBatch)
                                .collect(Collectors.toList());
        }

        private DashboardBatch mapToDashboardBatch(Batch batch) {
                int assetCount = imageUploadRepository.findByBatchIdOrderByCreatedAtDesc(batch.getId()).size();
                String projId = batch.getProject() != null ? batch.getProject().getId().toString() : null;
                String projName = batch.getProject() != null ? batch.getProject().getName() : null;

                return DashboardBatch.builder()
                                .id(batch.getId().toString())
                                .name(batch.getName())
                                .assets(assetCount)
                                .status(batch.getStatus() != null ? batch.getStatus() : "In Progress")
                                .completion(batch.getCompletion() != null ? batch.getCompletion() : 0)
                                .assignedTo(batch.getAssignedTo() != null ? batch.getAssignedTo() : "Unassigned")
                                .dueDate(batch.getDueDate() != null ? batch.getDueDate() : "Not set")
                                .projectId(projId)
                                .projectName(projName)
                                .build();
        }
}
