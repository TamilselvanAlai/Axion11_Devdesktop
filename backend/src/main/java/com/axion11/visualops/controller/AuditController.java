package com.axion11.visualops.controller;

import com.axion11.visualops.models.AuditLog;
import com.axion11.visualops.service.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/audit")
@RequiredArgsConstructor
public class AuditController {

    private final AuditService auditService;

    @GetMapping
    public ResponseEntity<List<AuditLog>> getAll() {
        return ResponseEntity.ok(auditService.getAll());
    }

    @GetMapping("/asset/{assetId}")
    public ResponseEntity<List<AuditLog>> getByAsset(@PathVariable("assetId") Long assetId) {
        return ResponseEntity.ok(auditService.getByAsset(assetId));
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<List<AuditLog>> getByProject(@PathVariable("projectId") Long projectId) {
        return ResponseEntity.ok(auditService.getByProject(projectId));
    }

    @GetMapping("/stats/images-processed")
    public ResponseEntity<Long> getImagesProcessed(
            @RequestParam(value = "from", required = false) String from,
            @RequestParam(value = "to", required = false) String to) {
        if (from != null && to != null && !from.isEmpty() && !to.isEmpty()) {
            LocalDate fromDate = LocalDate.parse(from);
            LocalDate toDate = LocalDate.parse(to);
            return ResponseEntity.ok(auditService.getImagesProcessedBetween(
                    fromDate.atStartOfDay(), toDate.plusDays(1).atStartOfDay()));
        }
        return ResponseEntity.ok(auditService.getImagesProcessedThisMonth());
    }
}
