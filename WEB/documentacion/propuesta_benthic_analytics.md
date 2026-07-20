# Propuesta de Comercialización y Arquitectura: Benthic Security & Analytics

Este documento consolida la estrategia comercial, el flujo de ventas, los costos y la arquitectura técnica para la suite de seguridad y analítica de **Benthic**.

---

## 1. Modelo Comercial y Planes de Servicio

### 💳 **Suscripción Mensual de Software + Soporte Continuo**
- **Incluye:**
  - Licencia de uso del motor de IA y software de detección Benthic.
  - Acceso al Portal Cloud Benthic (Alertas, Historial de Capturas y Gestión).
  - Canales de notificación en tiempo real (WhatsApp, Email, App Push).
  - Entrenamiento y optimización continua de los modelos de IA según escenas del cliente.
  - Soporte técnico proactivo, actualizaciones de software y monitoreo de salud del sistema (Heartbeat).

---

## 2. Flujo de Adopción e Instalación

```mermaid
graph TD
    A[1. Reunión de Factibilidad Gratuita] --> B[2. Auditoría Técnica de Hardware y Red]
    B --> C{¿Las cámaras actuales son aptas?}
    
    C -->|Sí - Compatible| D[Implementación Directa de Benthic Software]
    D --> E[SIN Costo Adicional de Hardware/Instalación de Cámaras]
    
    C -->|No - Incompatible/Mala Calidad| F[Propuesta de Renovación de Hardware Opcional]
    F --> G[Instalación de Cámaras Homologadas Benthic]
    
    E --> H[Suscripción Mensual + Soporte Activo]
    G --> H
    
    style A fill:#2563eb,stroke:#fff,color:#fff
    style C fill:#f59e0b,stroke:#fff,color:#fff
    style E fill:#10b981,stroke:#fff,color:#fff
    style F fill:#ef4444,stroke:#fff,color:#fff
    style H fill:#8b5cf6,stroke:#fff,color:#fff
```

### 📋 **Etapas del Flujo:**

1. **Reunión de Factibilidad:**
   - Análisis de las necesidades de seguridad y zonas clave del cliente.
   - Determinación del alcance (cantidad de canales/cámaras y analíticas requeridas).

2. **Auditoría Técnica de Cámaras:**
   - Verificación de flujos RTSP, resolución, tasa de cuadros (FPS) y visibilidad nocturna.
   - Evaluación del estado del cableado e infraestructura de red existente.

3. **Escenario A — Hardware Existente Compatible ($0 Costo Adicional de Cámaras):**
   - Si la infraestructura actual cumple con los estándares, se despliega el software Benthic sobre su hardware actual.
   - El cliente solo paga la **suscripción mensual del software con soporte**.

4. **Escenario B — Instalación de Cámaras Homologadas (Costo Adicional Opcional):**
   - Si el hardware es obsoleto o de baja calidad, se presenta una cotización separada por la provisión e instalación de cámaras de alta fidelidad.
   - El cliente decide si adquiere el hardware con Benthic para asegurar la máxima precisión.

---

## 3. Arquitectura Híbrida del Sistema (Edge + Cloud)

```mermaid
graph TD
    subgraph Cliente ["Infraestructura del Cliente (Edge)"]
        CAM["Cámaras HD / 24/7 (Existentes o Benthic)"] -->|Stream RTSP Local| NVR["Benthic Core (Local / NVR)"]
        NVR -->|Grabación Continua 24/7| HDD["Almacenamiento Local (Discos del Cliente)"]
        NVR -->|Procesamiento IA Local| DET{"¿Evento Detectado?"}
    end

    subgraph BenthicCloud ["Nube y Portal Benthic"]
        DET -->|Solo Alerta + Captura JPG| API["API Gateway Benthic"]
        API --> DB[("Historial de Alertas y Evidencias")]
        API --> NOTIF["Servicio de Alertas (WhatsApp / Push / Email)"]
        API --> DASH["Dashboard Web Benthic (Eventos & Fotos)"]
        API --> TRAIN["Bóveda de Entrenamiento de IA"]
        TRAIN -->|Modelo Optimizado| NVR
    end

    style Cliente fill:#1f2937,stroke:#374151,color:#fff
    style BenthicCloud fill:#0f172a,stroke:#1e293b,color:#fff
    style NVR fill:#2563eb,stroke:#60a5fa,color:#fff
    style API fill:#059669,stroke:#34d399,color:#fff
```

---

## 4. Matriz Comercial de Preguntas Frecuentes (FAQ)

| Pregunta del Cliente | Respuesta de Benthic |
| :--- | :--- |
| **¿Tengo que comprar cámaras nuevas sí o sí?** | No. Primero realizamos una **reunión de factibilidad y auditoría sin costo**. Si tus cámaras actuales cumplen con nuestros estándares mínimos de resolución y fluidez, las integramos directamente sin cobrarte instalación de cámaras. |
| **¿Qué incluye la suscripción mensual?** | Incluye la licencia del software de analítica con IA, acceso al portal en la nube de alertas, notificaciones en tiempo real (WhatsApp/App), entrenamiento continuo de tus modelos y soporte técnico preventivo 24/7. |
| **¿Qué pasa si mis cámaras son de mala calidad?** | Te ofreceremos de manera opcional un paquete de hardware homologado con su costo de instalación transparente. Tienes la libertad de decidir si renovarlas con nosotros. |
| **¿Dónde se guardan mis videos?** | El video continuo de 24 horas se queda en tu empresa por privacidad. A la nube de Benthic solo viaja una captura JPG y la notificación cuando la IA detecta un evento relevante. |
