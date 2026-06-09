import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router'; // <-- Herramienta para leer URLs

@Component({
  selector: 'app-gramola',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gramola.html',
  styleUrl: './gramola.css'
})
export class GramolaComponent implements OnInit {

  codigoAutorizacion: string | null = null;

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // Nada más cargar la pantalla, leemos la URL buscando el '?code='
    this.route.queryParams.subscribe(params => {
      this.codigoAutorizacion = params['code'];
      
      if (this.codigoAutorizacion) {
        console.log("🎉 ¡CÓDIGO ATRAPADO!: ", this.codigoAutorizacion);
        // ¡El próximo paso será enviarle este código a Java!
      } else {
        console.log("No hay código en la URL...");
      }
    });
  }
}
