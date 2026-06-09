import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; 
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import { PaymentService } from '../services/payment.service';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './payment.html', 
  styleUrl: './payment.css'       
})
export class PaymentComponent implements OnInit {
  stripe: Stripe | null = null;
  elements: StripeElements | null = null;

  message: string = '';
  loading: boolean = false;
  successMessage: string | null = null;

  selectedPlan: string = '';
  selectedPrice: number = 0;
  plans: any[] = [];

  token: string = '';
  transactionId: string = '';

  constructor(
    private paymentService: PaymentService, 
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute, 
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe(params => {
      this.token = params['token'] || '';

      if (!this.token) {
        this.message = 'Error: Enlace de pago no válido. Falta el token.';
      }
    });

    this.loadPlans();

    this.stripe = await loadStripe('pk_test_51Tc8UDJX5eRLV69oXaS33MzSgxXxOC2TmP7zd5DXINOXj9FjnbodD183t63CCmJxmkMr8HtxW8LYDf1IDuhowafJ00celKzaA2');
  }

  private loadPlans(): void {
    this.paymentService.getPlans().subscribe({
      next: (data) => {
        this.plans = data || [];
        this.cdr.detectChanges();
      },
      error: () => {
        this.message = 'No se han podido cargar los planes de suscripción.';
        this.cdr.detectChanges();
      }
    });
  }

  selectPlan(plan: any): void {
    this.selectedPlan = plan.name;
    this.selectedPrice = plan.price;
    this.message = 'Preparando pasarela segura...';
    this.cdr.detectChanges();
    
    this.paymentService.prepay(plan.name).subscribe({
      next: async (res) => {
        this.transactionId = res.id;

        const stripeData = JSON.parse(res.data);
        const clientSecret = stripeData.client_secret;

        if (!this.stripe || !clientSecret) {
          this.message = 'No se ha podido preparar el formulario de pago.';
          this.cdr.detectChanges();
          return;
        }

        this.elements = this.stripe.elements({ clientSecret });

        setTimeout(() => {
          const paymentElement = this.elements?.create('payment');
          paymentElement?.mount('#payment-element');

          this.message = '';
          this.cdr.detectChanges();
        }, 0);
      },
      error: () => {
        this.message = 'Error al conectar con el servidor de pagos.';
        this.cdr.detectChanges();
      }
    });
  }

  async pay(): Promise<void> {
    if (!this.stripe || !this.elements) {
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    const result = await this.stripe.confirmPayment({
      elements: this.elements,
      redirect: 'if_required' 
    });

    if (result.error) {
      this.message = result.error.message || 'Error al procesar el pago.';
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    if (result.paymentIntent?.status === 'succeeded') {
      this.confirmSubscriptionPayment();
      return;
    }

    this.message = 'El pago no se ha completado correctamente.';
    this.loading = false;
    this.cdr.detectChanges();
  }

  private confirmSubscriptionPayment(): void {
    this.paymentService.confirm(this.transactionId, this.token, this.selectedPlan).subscribe({
      next: () => {
        this.successMessage = 'Suscripción activada correctamente. Ya puedes iniciar sesión.';
        this.message = '';
        this.loading = false;
        this.cdr.detectChanges();

        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1800);
      },
      error: () => {
        this.message = 'Se cobró correctamente, pero hubo un error al activar la cuenta.';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
