# Introducción y Arquitectura General

*Documentación Técnica Oficial Benthic Core — Módulo 1*
*Fuente Original:* [https://docs.frigate.video/](https://docs.frigate.video/)

> **Navegación Rápida:** ▶️ *Inicio de la Documentación* | ➡️ **Siguiente:** [Hardware Recomendado y Aceleradores](./02_hardware_recomendado.md)

---

* [

](/)
* Frigate
* IntroductionOn this page

# Introduction

A complete and local NVR designed for Home Assistant with AI object detection. Uses OpenCV and Tensorflow to perform realtime object detection locally for IP cameras.

Use of a [Recommended Detector](/frigate/hardware#detectors) is optional, but strongly recommended. CPU detection should only be used for testing purposes.

* Tight integration with Home Assistant via a [custom component](https://github.com/blakeblackshear/frigate-hass-integration)

* Designed to minimize resource use and maximize performance by only looking for objects when and where it is necessary

* Leverages multiprocessing heavily with an emphasis on realtime over processing every frame

* Uses a very low overhead motion detection to determine where to run object detection

* Object detection with TensorFlow runs in separate processes for maximum FPS

* Communicates over MQTT for easy integration into other systems

* Recording with retention based on detected objects

* Re-streaming via RTSP to reduce the number of connections to your camera

* A dynamic combined camera view of all tracked cameras.

## Screenshots[​](#screenshots)

![Imagen](/assets/images/live-view-c0b5423966d937ac7f750b67bf8cdf50.png)

![Imagen](/assets/images/review-items-c7914c6f1b3d92d38b56e6d3559074bc.png)

![Imagen](/assets/images/media_browser-min-1f8a7c629d1bdbee1c78f99a97a0219a.png)

![Imagen](/assets/images/notification-min-2f4dd1c2ad07e908a34c04e02e2c78b7.png)

[Edit this page](https://github.com/blakeblackshear/frigate/edit/master/docs/docs/frigate/index.md)


---

## 🧭 Siguiente Capítulo de la Documentación

| Cap. Anterior | Cap. Siguiente |
| :--- | ---: |
| ▶️ *Inicio de la Documentación* | ➡️ **Siguiente:** [Hardware Recomendado y Aceleradores](./02_hardware_recomendado.md) |
