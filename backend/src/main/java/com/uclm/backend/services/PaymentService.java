package com.uclm.backend.services;

import com.stripe.Stripe;
import com.stripe.model.PaymentIntent;
import com.stripe.param.PaymentIntentCreateParams;

import com.uclm.backend.entities.StripeTransaction;
import com.uclm.backend.entities.SubscriptionPlan;
import com.uclm.backend.entities.User;
import com.uclm.backend.repositories.StripeTransactionRepository;
import com.uclm.backend.repositories.SubscriptionPlanRepository;
import com.uclm.backend.repositories.UserRepository;

import jakarta.annotation.PostConstruct;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PaymentService {

    private static final String CURRENCY = "eur";

    @Value("${stripe.api.key}")
    private String stripeApiKey;

    @Autowired
    private StripeTransactionRepository stripeTransactionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @PostConstruct
    public void init() {
        Stripe.apiKey = stripeApiKey;
    }

    public StripeTransaction prepay(String plan) throws Exception {
        SubscriptionPlan subscriptionPlan = subscriptionPlanRepository.findByNameIgnoreCase(plan)
                .orElseThrow(() -> new Exception("No existe el plan de suscripción seleccionado."));

        Double priceInEuros = subscriptionPlan.getPrice();

        if (priceInEuros == null || priceInEuros <= 0) {
            throw new Exception("El precio del plan no es válido.");
        }

        long amountInCents = convertEurosToCents(priceInEuros);

        return createStripeTransaction(amountInCents);
    }

    public void confirmPayment(String transactionId, String token, String plan) throws Exception {
        if (transactionId == null || transactionId.isBlank()) {
            throw new Exception("No se ha recibido la transacción de Stripe.");
        }

        if (token == null || token.isBlank()) {
            throw new Exception("No se ha recibido el token de registro.");
        }

        User user = userRepository.findByCreationTokenId(token)
                .orElseThrow(() -> new Exception("El token de registro no es válido o ha expirado."));

        if (!user.isEmailConfirmed()) {
            throw new Exception("Primero debes confirmar el correo electrónico.");
        }

        StripeTransaction transaction = stripeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new Exception("La transacción de pago no existe en el sistema."));

        PaymentIntent intent = PaymentIntent.retrieve(transactionId);

        if (!"succeeded".equals(intent.getStatus())) {
            throw new Exception("El pago todavía no está confirmado en Stripe. Estado actual: " + intent.getStatus());
        }

        transaction.setEmail(user.getEmail());
        transaction.setData(intent.toJson());
        stripeTransactionRepository.save(transaction);

        user.setPaid(true);
        user.setActive(true);

        if (plan != null && !plan.isBlank()) {
            user.setSubscriptionPlan(plan);
        }

        userRepository.save(user);
    }

    public StripeTransaction prepayTrack(String barEmail) throws Exception {
        User bar = findBarByEmail(barEmail);

        Double priceInEuros = bar.getTrackPrice();

        if (priceInEuros == null || priceInEuros <= 0) {
            throw new Exception("El bar no tiene configurado un precio válido por canción.");
        }

        long amountInCents = convertEurosToCents(priceInEuros);

        return createStripeTransaction(amountInCents);
    }

    public void confirmTrackPayment(String transactionId, String barEmail) throws Exception {
        if (transactionId == null || transactionId.isBlank()) {
            throw new Exception("No se ha recibido la transacción de Stripe.");
        }

        if (barEmail == null || barEmail.isBlank()) {
            throw new Exception("No se ha recibido el email del bar.");
        }

        StripeTransaction transaction = stripeTransactionRepository.findById(transactionId)
                .orElseThrow(() -> new Exception("La transacción no existe en nuestra base de datos."));

        PaymentIntent intent = PaymentIntent.retrieve(transactionId);

        if (!"succeeded".equals(intent.getStatus())) {
            throw new Exception("El pago todavía no está confirmado en Stripe. Estado actual: " + intent.getStatus());
        }

        transaction.setEmail(barEmail);
        transaction.setData(intent.toJson());

        stripeTransactionRepository.save(transaction);
    }

    public Double getTrackPrice(String barEmail) throws Exception {
        User bar = findBarByEmail(barEmail);

        Double trackPrice = bar.getTrackPrice();

        if (trackPrice == null || trackPrice <= 0) {
            throw new Exception("El bar no tiene configurado un precio válido por canción.");
        }

        return trackPrice;
    }

    public Double updateTrackPrice(String barEmail, Double trackPrice) throws Exception {
        if (trackPrice == null || trackPrice <= 0) {
            throw new Exception("El precio por canción debe ser mayor que 0.");
        }

        User bar = findBarByEmail(barEmail);

        bar.setTrackPrice(trackPrice);
        userRepository.save(bar);

        return bar.getTrackPrice();
    }

    private StripeTransaction createStripeTransaction(long amountInCents) throws Exception {
        if (amountInCents <= 0) {
            throw new Exception("El importe del pago debe ser mayor que 0.");
        }

        PaymentIntentCreateParams params = PaymentIntentCreateParams.builder()
                .setAmount(amountInCents)
                .setCurrency(CURRENCY)
                .setAutomaticPaymentMethods(
                        PaymentIntentCreateParams.AutomaticPaymentMethods.builder()
                                .setEnabled(true)
                                .build()
                )
                .build();

        PaymentIntent intent = PaymentIntent.create(params);

        StripeTransaction transaction = new StripeTransaction();
        transaction.setId(intent.getId());
        transaction.setData(intent.toJson());

        return stripeTransactionRepository.save(transaction);
    }

    private User findBarByEmail(String barEmail) throws Exception {
        if (barEmail == null || barEmail.isBlank()) {
            throw new Exception("No se ha recibido el email del bar.");
        }

        return userRepository.findById(barEmail)
                .orElseThrow(() -> new Exception("El bar no existe."));
    }

    private long convertEurosToCents(Double euros) {
        return Math.round(euros * 100);
    }
}
