# Index de Documentación Técnica: Benthic Camera Analytics Core

Este directorio contiene la documentación técnica completa del motor de analítica de cámaras y detección por Inteligencia Artificial (basado en Frigate NVR) adaptado para **Benthic OPS**.

---

## 📚 Índice de Capítulos

| # | Capítulo | Archivo | Descripción |
|---|---|---|---|
| 1 | **Introducción y Arquitectura** | [01_introduccion_y_arquitectura.md](./01_introduccion_y_arquitectura.md) | Principios de diseño, procesamiento local en tiempo real y flujo general. |
| 2 | **Hardware Recomendado** | [02_hardware_recomendado.md](./02_hardware_recomendado.md) | Especificaciones de Google Coral EdgeTPU, GPUs (Intel/Nvidia) y CPUs. |
| 3 | **Instalación y Despliegue** | [03_instalacion_y_despliegue.md](./03_instalacion_y_despliegue.md) | Guía de despliegue mediante Docker y Docker Compose. |
| 4 | **Configuración de Cámaras** | [04_configuracion_de_camaras.md](./04_configuracion_de_camaras.md) | Configuración de flujos RTSP, FPS y resoluciones óptimas. |
| 5 | **Pipeline de Video e IA** | [05_pipeline_de_video_e_ia.md](./05_pipeline_de_video_e_ia.md) | Flujo paso a paso desde el decoding de video hasta la detección del objeto. |
| 6 | **Configuración Referencia YAML** | [06_configuracion_referencia.md](./06_configuracion_referencia.md) | Archivo completo de opciones de configuración `config.yml`. |
| 7 | **Detectores de Objetos** | [07_detectores_de_objetos.md](./07_detectores_de_objetos.md) | Configuración de aceleradores de hardware para inferencia IA. |
| 8 | **Zonas y Máscaras** | [08_zonas_y_mascaras.md](./08_zonas_y_mascaras.md) | Delimitación de zonas de alerta y máscaras para evitar falsos positivos. |
| 9 | **Modelos de IA & Fine-Tuning** | [09_frigate_plus_modelos_ia.md](./09_frigate_plus_modelos_ia.md) | Entrenamiento personalizado con escenas propias y modelos Benthic+. |
| 10 | **Integraciones & MQTT** | [10_integracion_home_assistant_mqtt.md](./10_integracion_home_assistant_mqtt.md) | Integración de eventos con Home Assistant, MQTT y Webhooks. |

---
*Cada capítulo incluye botones navegables al final para avanzar secuencialmente (`Siguiente ➡️`) o retroceder (`◀️ Anterior`).*
