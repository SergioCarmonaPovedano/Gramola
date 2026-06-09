package com.uclm.backend.controllers;

import com.uclm.backend.entities.SubscriptionPlan;
import com.uclm.backend.repositories.SubscriptionPlanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/subscriptions")
@CrossOrigin(origins = "*")
public class SubscriptionController {

    @Autowired
    private SubscriptionPlanRepository repository;

    @GetMapping("/plans")
    public List<SubscriptionPlan> getPlans() {
        // Devuelve la lista de planes directamente desde la base de datos
        return repository.findAll();
    }
}
