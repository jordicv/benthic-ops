# Integración con Home Assistant y MQTT

*Documentación Técnica Oficial Benthic Core — Módulo 10*
*Fuente Original:* [https://docs.frigate.video/integrations/home-assistant](https://docs.frigate.video/integrations/home-assistant)

> **Navegación Rápida:** ◀️ **Anterior:** [Modelos de IA y Entrenamiento Personalizado](./09_frigate_plus_modelos_ia.md) | 🏁 *Fin de la Sección*

---

* [

](/)
* Integrations
* Home Assistant IntegrationOn this page

# Home Assistant Integration

The best way to integrate with Home Assistant is to use the [official integration](https://github.com/blakeblackshear/frigate-hass-integration).

## Installation[​](#installation)

### Preparation[​](#preparation)

The Frigate integration requires the `mqtt` integration to be installed and
manually configured first.

See the [MQTT integration
documentation](https://www.home-assistant.io/integrations/mqtt/) for more
details.

In addition, MQTT must be enabled in your Frigate configuration file and Frigate must be connected to the same MQTT server as Home Assistant for many of the entities created by the integration to function, e.g.:

`mqtt:  enabled: True  host: mqtt.server.com # the address of your HA server that's running the MQTT integration  user: your_mqtt_broker_username  password: your_mqtt_broker_password`

### Integration installation[​](#integration-installation)

Available via HACS as a default repository. To install:

* Use [HACS](https://hacs.xyz/) to install the integration:

`Home Assistant > HACS > Click in the Search bar and type "Frigate" > Frigate`

* Restart Home Assistant.

* Then add/configure the integration:

```yaml
`Home Assistant > Settings > Devices & Services > Add Integration > Frigate`
```

Note: You will also need
[media_source](https://www.home-assistant.io/integrations/media_source/) enabled
in your Home Assistant configuration for the Media Browser to appear.

### (Optional) Lovelace Card Installation[​](#optional-lovelace-card-installation)

To install the optional companion Lovelace card, please see the [separate
installation instructions](https://github.com/dermotduffy/frigate-hass-card) for
that card.

## Configuration[​](#configuration)

When configuring the integration, you will be asked for the `URL` of your Frigate instance which can be pointed at the internal unauthenticated port (`5000`) or the authenticated port (`8971`) for your instance. This may look like `http://<host>:5000/`.

### Docker Compose Examples[​](#docker-compose-examples)

If you are running Home Assistant and Frigate with Docker Compose on the same device, here are some examples.

#### Home Assistant running with host networking[​](#home-assistant-running-with-host-networking)

It is not recommended to run Frigate in host networking mode. In this example, you would use `http://172.17.0.1:5000` or `http://172.17.0.1:8971` when configuring the integration.

`services:  homeassistant:    image: ghcr.io/home-assistant/home-assistant:stable    network_mode: host    ...  frigate:    image: ghcr.io/blakeblackshear/frigate:stable    ...    ports:      - "172.17.0.1:5000:5000"      ...`

#### Home Assistant not running with host networking or in a separate compose file[​](#home-assistant-not-running-with-host-networking-or-in-a-separate-compose-file)

In this example, it is recommended to connect to the authenticated port, for example, `http://frigate:8971` when configuring the integration. There is no need to map the port for the Frigate container.

`services:  homeassistant:    image: ghcr.io/home-assistant/home-assistant:stable    # network_mode: host    ...  frigate:    image: ghcr.io/blakeblackshear/frigate:stable    ...    ports:      # - "172.17.0.1:5000:5000"      ...`

### Home Assistant App[​](#home-assistant-app)

If you are using Home Assistant App, the URL should be one of the following depending on which App variant you are using. Note that if you are using the Proxy App, you should NOT point the integration at the proxy URL. Just enter the same URL used to access Frigate directly from your network.

App VariantURLFrigate`http://ccab4aaf-frigate:5000`Frigate (Full Access)`http://ccab4aaf-frigate-fa:5000`Frigate Beta`http://ccab4aaf-frigate-beta:5000`Frigate Beta (Full Access)`http://ccab4aaf-frigate-fa-beta:5000`

### Frigate running on a separate machine[​](#frigate-running-on-a-separate-machine)

If you run Frigate on a separate device within your local network, Home Assistant will need access to port 8971.

#### Local network[​](#local-network)

Use `http://<frigate_device_ip>:8971` as the URL for the integration so that authentication is required.

tipThe above URL assumes you have [disabled TLS](/configuration/tls).
By default, TLS is enabled and Frigate will be using a self-signed certificate. HomeAssistant will fail to connect HTTPS to port 8971 since it fails to verify the self-signed certificate.
Either disable TLS and use HTTP from HomeAssistant, or configure Frigate to be acessible with a valid certificate.

`services:  frigate:    image: ghcr.io/blakeblackshear/frigate:stable    ...    ports:      - "8971:8971"      ...`

#### Tailscale or other private networking[​](#tailscale-or-other-private-networking)

Use `http://<frigate_device_tailscale_ip>:5000` as the URL for the integration.

`services:  frigate:    image: ghcr.io/blakeblackshear/frigate:stable    ...    ports:      - "<tailscale_ip>:5000:5000"      ...`

## Options[​](#options)

```yaml
`Home Assistant > Configuration > Integrations > Frigate > Options`
```

OptionDescriptionRTSP URL TemplateA [jinja2](https://jinja.palletsprojects.com/) template that is used to override the standard RTSP stream URL (e.g. for use with reverse proxies). This option is only shown to users who have [advanced mode](https://www.home-assistant.io/blog/2019/07/17/release-96/#advanced-mode) enabled. See [RTSP streams](#rtsp-stream) below.

## Entities Provided[​](#entities-provided)

PlatformDescription`camera`Live camera stream (requires RTSP).`image`Image of the latest detected object for each camera.`sensor`States to monitor Frigate performance, object counts for all zones and cameras.`switch`Switch entities to toggle detection, recordings and snapshots.`binary_sensor`A "motion" binary sensor entity per camera/zone/object.

## Media Browser Support[​](#media-browser-support)

The integration provides:

* Browsing tracked object recordings with thumbnails

* Browsing snapshots

* Browsing recordings by month, day, camera, time

This is accessible via "Media Browser" on the left menu panel in Home Assistant.

## Casting Clips To Media Devices[​](#casting-clips-to-media-devices)

The integration supports casting clips and camera streams to supported media devices.

tipFor clips to be castable to media devices, audio is required and may need to be [enabled for recordings](/troubleshooting/faqs#audio-in-recordings).

NOTE: Even if you camera does not support audio, audio will need to be enabled for Casting to be accepted.

## Camera API[​](#camera-api)

To disable a camera dynamically

`action: camera.turn_offdata: {}target:  entity_id: camera.back_deck_cam  # your Frigate camera entity ID`
To enable a camera that has been disabled dynamically

`action: camera.turn_ondata: {}target:  entity_id: camera.back_deck_cam  # your Frigate camera entity ID`

## Notification API[​](#notification-api)

Many people do not want to expose Frigate to the web, so the integration creates some public API endpoints that can be used for notifications.

To load a thumbnail for a tracked object:

`https://HA_URL/api/frigate/notifications/<event-id>/thumbnail.jpg`
To load a snapshot for a tracked object:

`https://HA_URL/api/frigate/notifications/<event-id>/snapshot.jpg`
To load a video clip of a tracked object using an Android device:

`https://HA_URL/api/frigate/notifications/<event-id>/clip.mp4`
To load a video clip of a tracked object using an iOS device:

`https://HA_URL/api/frigate/notifications/<event-id>/master.m3u8`
To load a preview gif of a tracked object:

`https://HA_URL/api/frigate/notifications/<event-id>/event_preview.gif`
To load a preview gif of a review item:

`https://HA_URL/api/frigate/notifications/<review-id>/review_preview.gif`
To load the thumbnail of a review item:

`https://HA_URL/api/frigate/notifications/<review-id>/<camera>/review_thumbnail.webp`

## RTSP stream[​](#rtsp-stream)

In order for the live streams to function they need to be accessible on the RTSP
port (default: `8554`) at `<frigatehost>:8554`. Home Assistant will directly
connect to that streaming port when the live camera is viewed.

#### RTSP URL Template[​](#rtsp-url-template)

For advanced usecases, this behavior can be changed with the [RTSP URL
template](#options) option. When set, this string will override the default stream
address that is derived from the default behavior described above. This option supports
[jinja2 templates](https://jinja.palletsprojects.com/) and has the `camera` dict
variables from [Frigate API](/integrations/api)
available for the template. Note that no Home Assistant state is available to the
template, only the camera dict from Frigate.

This is potentially useful when Frigate is behind a reverse proxy, and/or when
the default stream port is otherwise not accessible to Home Assistant (e.g.
firewall rules).

###### RTSP URL Template Examples[​](#rtsp-url-template-examples)

Use a different port number:

`rtsp://<frigate_host>:2000/front_door`
Use the camera name in the stream URL:

`rtsp://<frigate_host>:2000/{{ name }}`
Use the camera name in the stream URL, converting it to lowercase first:

`rtsp://<frigate_host>:2000/{{ name|lower }}`

## Multiple Instance Support[​](#multiple-instance-support)

The Frigate integration seamlessly supports the use of multiple Frigate servers.

### Requirements for Multiple Instances[​](#requirements-for-multiple-instances)

In order for multiple Frigate instances to function correctly, the
`topic_prefix` and `client_id` parameters must be set differently per server.
See [MQTT
configuration](/integrations/mqtt)
for how to set these.

#### API URLs[​](#api-urls)

When multiple Frigate instances are configured, [API](#notification-api) URLs should include an
identifier to tell Home Assistant which Frigate instance to refer to. The
identifier used is the MQTT `client_id` parameter included in the configuration,
and is used like so:

`https://HA_URL/api/frigate/<client-id>/notifications/<event-id>/thumbnail.jpg`

```yaml
`https://HA_URL/api/frigate/<client-id>/clips/front_door-1624599978.427826-976jaa.mp4`
```

#### Default Treatment[​](#default-treatment)

When a single Frigate instance is configured, the `client-id` parameter need not
be specified in URLs/identifiers -- that single instance is assumed. When
multiple Frigate instances are configured, the user must explicitly specify
which server they are referring to.

## FAQ[​](#faq)

#### If I am detecting multiple objects, how do I assign the correct `binary_sensor` to the camera in HomeKit?[​](#if-i-am-detecting-multiple-objects-how-do-i-assign-the-correct-binary_sensor-to-the-camera-in-homekit)

The [HomeKit integration](https://www.home-assistant.io/integrations/homekit/) randomly links one of the binary sensors (motion sensor entities) grouped with the camera device in Home Assistant. You can specify a `linked_motion_sensor` in the Home Assistant [HomeKit configuration](https://www.home-assistant.io/integrations/homekit/#linked_motion_sensor) for each camera.

#### I have set up automations based on the occupancy sensors. Sometimes the automation runs because the sensors are turned on, but then I look at Frigate I can't find the object that triggered the sensor. Is this a bug?[​](#i-have-set-up-automations-based-on-the-occupancy-sensors-sometimes-the-automation-runs-because-the-sensors-are-turned-on-but-then-i-look-at-frigate-i-cant-find-the-object-that-triggered-the-sensor-is-this-a-bug)

No. The occupancy sensors have fewer checks in place because they are often used for things like turning the lights on where latency needs to be as low as possible. So false positives can sometimes trigger these sensors. If you want false positive filtering, you should use an mqtt sensor on the `frigate/events` or `frigate/reviews` topic.

[Edit this page](https://github.com/blakeblackshear/frigate/edit/master/docs/docs/integrations/home-assistant.md)


---

## 🧭 Siguiente Capítulo de la Documentación

| Cap. Anterior | Cap. Siguiente |
| :--- | ---: |
| ◀️ **Anterior:** [Modelos de IA y Entrenamiento Personalizado](./09_frigate_plus_modelos_ia.md) | 🏁 *Fin de la Sección* |
