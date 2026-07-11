<?php
/**
 * Plugin Name: Woof ID Push Admin
 * Description: Verstuur pushmeldingen naar Woof ID-gebruikers vanuit WordPress.
 * Version: 1.0.0
 * Author: Doggy Beach House
 * Requires at least: 6.0
 * Text Domain: woof-id-push-admin
 */

if (!defined('ABSPATH')) {
    exit;
}

define('WIPA_VERSION', '1.0.0');
define('WIPA_OPTION_API_URL', 'wipa_api_url');
define('WIPA_OPTION_API_SECRET', 'wipa_api_secret');

function wipa_default_api_url(): string
{
    return 'https://woof-id-app.vercel.app';
}

function wipa_api_url(): string
{
    $url = get_option(WIPA_OPTION_API_URL, wipa_default_api_url());
    return esc_url(rtrim((string) $url, '/'));
}

function wipa_api_secret(): string
{
    return trim((string) get_option(WIPA_OPTION_API_SECRET, ''));
}

function wipa_register_settings(): void
{
    register_setting('wipa_settings', WIPA_OPTION_API_URL, [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => wipa_default_api_url(),
    ]);

    register_setting('wipa_settings', WIPA_OPTION_API_SECRET, [
        'type' => 'string',
        'sanitize_callback' => 'sanitize_text_field',
        'default' => '',
    ]);

    add_settings_section(
        'wipa_main',
        __('Woof ID API', 'woof-id-push-admin'),
        function () {
            echo '<p>' . esc_html__(
                'Koppel WordPress aan de Woof ID-app. Gebruik hetzelfde geheim als WOOF_PUSH_ADMIN_SECRET op Vercel.',
                'woof-id-push-admin'
            ) . '</p>';
        },
        'wipa_settings'
    );

    add_settings_field(
        WIPA_OPTION_API_URL,
        __('Woof ID API URL', 'woof-id-push-admin'),
        function () {
            $val = get_option(WIPA_OPTION_API_URL, wipa_default_api_url());
            printf(
                '<input type="url" class="regular-text" name="%1$s" id="%1$s" value="%2$s" placeholder="%3$s" />',
                esc_attr(WIPA_OPTION_API_URL),
                esc_attr($val),
                esc_attr(wipa_default_api_url())
            );
            echo '<p class="description">' . esc_html__(
                'Basis-URL van de Woof ID-app, zonder slash aan het einde.',
                'woof-id-push-admin'
            ) . '</p>';
        },
        'wipa_settings',
        'wipa_main'
    );

    add_settings_field(
        WIPA_OPTION_API_SECRET,
        __('API-geheim', 'woof-id-push-admin'),
        function () {
            $val = get_option(WIPA_OPTION_API_SECRET, '');
            printf(
                '<input type="password" class="regular-text" name="%1$s" id="%1$s" value="%2$s" autocomplete="new-password" />',
                esc_attr(WIPA_OPTION_API_SECRET),
                esc_attr($val)
            );
            echo '<p class="description">' . esc_html__(
                'Wordt als X-Woof-Push-Secret header meegestuurd. Moet overeenkomen met WOOF_PUSH_ADMIN_SECRET op Vercel.',
                'woof-id-push-admin'
            ) . '</p>';
        },
        'wipa_settings',
        'wipa_main'
    );
}
add_action('admin_init', 'wipa_register_settings');

function wipa_admin_menu(): void
{
    add_menu_page(
        __('Woof ID Push', 'woof-id-push-admin'),
        __('Woof ID Push', 'woof-id-push-admin'),
        'manage_options',
        'wipa-send',
        'wipa_render_send_page',
        'dashicons-megaphone',
        58
    );

    add_submenu_page(
        'wipa-send',
        __('Push versturen', 'woof-id-push-admin'),
        __('Push versturen', 'woof-id-push-admin'),
        'manage_options',
        'wipa-send',
        'wipa_render_send_page'
    );

    add_submenu_page(
        'wipa-send',
        __('Instellingen', 'woof-id-push-admin'),
        __('Instellingen', 'woof-id-push-admin'),
        'manage_options',
        'wipa-settings',
        'wipa_render_settings_page'
    );
}
add_action('admin_menu', 'wipa_admin_menu');

function wipa_render_settings_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }

    echo '<div class="wrap">';
    echo '<h1>' . esc_html__('Woof ID Push — Instellingen', 'woof-id-push-admin') . '</h1>';
    echo '<form method="post" action="options.php">';
    settings_fields('wipa_settings');
    do_settings_sections('wipa_settings');
    submit_button();
    echo '</form></div>';
}

/**
 * @return array{ok:bool,status?:int,body?:array<string,mixed>,error?:string}
 */
function wipa_send_push_request(array $payload): array
{
    $url = wipa_api_url();
    $secret = wipa_api_secret();

    if (!$url) {
        return ['ok' => false, 'error' => __('Woof ID API URL ontbreekt.', 'woof-id-push-admin')];
    }

    if ($secret === '') {
        return ['ok' => false, 'error' => __('API-geheim ontbreekt.', 'woof-id-push-admin')];
    }

    $response = wp_remote_post(
        $url . '/api/admin/push/send',
        [
            'timeout' => 30,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Woof-Push-Secret' => $secret,
            ],
            'body' => wp_json_encode($payload),
        ]
    );

    if (is_wp_error($response)) {
        return [
            'ok' => false,
            'error' => $response->get_error_message(),
        ];
    }

    $status = (int) wp_remote_retrieve_response_code($response);
    $raw_body = wp_remote_retrieve_body($response);
    $body = json_decode($raw_body, true);
    if (!is_array($body)) {
        $body = [];
    }

    if ($status < 200 || $status >= 300) {
        $error = isset($body['error']) && is_string($body['error']) ? $body['error'] : 'request_failed';
        $messages = [
            'unauthorized' => __('API-geheim geweigerd. Controleer WOOF_PUSH_ADMIN_SECRET op Vercel.', 'woof-id-push-admin'),
            'invalid_input' => __('Ongeldige invoer. Controleer titel, tekst en doelgroep.', 'woof-id-push-admin'),
            'vapid_not_configured' => __('VAPID-sleutels ontbreken op de Woof ID-server.', 'woof-id-push-admin'),
            'sendFailed' => __('Versturen mislukt. Probeer het later opnieuw.', 'woof-id-push-admin'),
        ];

        return [
            'ok' => false,
            'status' => $status,
            'body' => $body,
            'error' => $messages[$error] ?? sprintf(
                /* translators: %s: HTTP status code */
                __('Verzoek mislukt (HTTP %s).', 'woof-id-push-admin'),
                (string) $status
            ),
        ];
    }

    return [
        'ok' => true,
        'status' => $status,
        'body' => $body,
    ];
}

function wipa_parse_emails(string $raw): array
{
    $parts = preg_split('/[\s,;]+/', $raw) ?: [];
    $emails = [];

    foreach ($parts as $part) {
        $email = sanitize_email(trim($part));
        if ($email !== '' && is_email($email)) {
            $emails[] = $email;
        }
    }

    return array_values(array_unique($emails));
}

function wipa_render_send_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }

    $notice = null;
    $notice_type = 'success';

    if (
        isset($_POST['wipa_send_push'])
        && check_admin_referer('wipa_send_push_action', 'wipa_send_push_nonce')
    ) {
        $title = sanitize_text_field(wp_unslash((string) ($_POST['wipa_title'] ?? '')));
        $body = sanitize_textarea_field(wp_unslash((string) ($_POST['wipa_body'] ?? '')));
        $link = esc_url_raw(wp_unslash((string) ($_POST['wipa_url'] ?? '')));
        $audience = sanitize_key(wp_unslash((string) ($_POST['wipa_audience'] ?? 'all')));
        $emails_raw = sanitize_textarea_field(wp_unslash((string) ($_POST['wipa_emails'] ?? '')));

        $payload = [
            'title' => $title,
            'body' => $body,
        ];

        if ($link !== '') {
            $payload['url'] = $link;
        }

        if ($audience === 'emails') {
            $emails = wipa_parse_emails($emails_raw);
            if ($emails === []) {
                $notice = __('Voer minstens één geldig e-mailadres in.', 'woof-id-push-admin');
                $notice_type = 'error';
            } else {
                $payload['emails'] = $emails;
            }
        } else {
            $payload['all'] = true;
        }

        if ($notice === null) {
            if ($title === '' || $body === '') {
                $notice = __('Titel en bericht zijn verplicht.', 'woof-id-push-admin');
                $notice_type = 'error';
            } else {
                $result = wipa_send_push_request($payload);

                if (!$result['ok']) {
                    $notice = $result['error'] ?? __('Onbekende fout.', 'woof-id-push-admin');
                    $notice_type = 'error';
                } else {
                    $data = $result['body'] ?? [];
                    $sent = isset($data['sent']) ? (int) $data['sent'] : 0;
                    $failed = isset($data['failed']) ? (int) $data['failed'] : 0;
                    $removed = isset($data['removed']) ? (int) $data['removed'] : 0;
                    $matched = isset($data['matchedUsers']) ? (int) $data['matchedUsers'] : null;

                    if ($matched !== null) {
                        $notice = sprintf(
                            /* translators: 1: sent count, 2: failed count, 3: matched users */
                            __('Verstuurd naar %1$d apparaat(en), %2$d mislukt, %3$d gebruiker(s) gevonden op e-mail.', 'woof-id-push-admin'),
                            $sent,
                            $failed,
                            $matched
                        );
                    } else {
                        $notice = sprintf(
                            /* translators: 1: sent count, 2: failed count */
                            __('Verstuurd naar %1$d apparaat(en), %2$d mislukt.', 'woof-id-push-admin'),
                            $sent,
                            $failed
                        );
                    }

                    if ($removed > 0) {
                        $notice .= ' ' . sprintf(
                            /* translators: %d: removed subscriptions */
                            __('%d verlopen abonnement(en) opgeruimd.', 'woof-id-push-admin'),
                            $removed
                        );
                    }
                }
            }
        }
    }

    $api_url = wipa_api_url();
    $has_secret = wipa_api_secret() !== '';

    echo '<div class="wrap">';
    echo '<h1>' . esc_html__('Woof ID Push versturen', 'woof-id-push-admin') . '</h1>';

    if (!$has_secret || $api_url === '') {
        echo '<div class="notice notice-warning"><p>';
        echo esc_html__(
            'Stel eerst de Woof ID API URL en het API-geheim in onder Instellingen.',
            'woof-id-push-admin'
        );
        echo ' <a href="' . esc_url(admin_url('admin.php?page=wipa-settings')) . '">';
        echo esc_html__('Naar instellingen', 'woof-id-push-admin') . '</a>';
        echo '</p></div>';
    }

    if ($notice !== null) {
        printf(
            '<div class="notice notice-%1$s is-dismissible"><p>%2$s</p></div>',
            esc_attr($notice_type),
            esc_html($notice)
        );
    }

    echo '<form method="post" class="wipa-send-form" style="max-width: 720px;">';
    wp_nonce_field('wipa_send_push_action', 'wipa_send_push_nonce');

    echo '<table class="form-table" role="presentation">';

    echo '<tr><th scope="row"><label for="wipa_title">';
    echo esc_html__('Titel', 'woof-id-push-admin') . '</label></th><td>';
    printf(
        '<input name="wipa_title" id="wipa_title" type="text" class="regular-text" maxlength="120" required value="%s" />',
        isset($_POST['wipa_title']) ? esc_attr(sanitize_text_field(wp_unslash((string) $_POST['wipa_title']))) : ''
    );
    echo '</td></tr>';

    echo '<tr><th scope="row"><label for="wipa_body">';
    echo esc_html__('Bericht', 'woof-id-push-admin') . '</label></th><td>';
    $body_value = isset($_POST['wipa_body'])
        ? sanitize_textarea_field(wp_unslash((string) $_POST['wipa_body']))
        : '';
    printf(
        '<textarea name="wipa_body" id="wipa_body" class="large-text" rows="5" maxlength="500" required>%s</textarea>',
        esc_textarea($body_value)
    );
    echo '</td></tr>';

    echo '<tr><th scope="row"><label for="wipa_url">';
    echo esc_html__('Link (optioneel)', 'woof-id-push-admin') . '</label></th><td>';
    printf(
        '<input name="wipa_url" id="wipa_url" type="url" class="regular-text" placeholder="https://woof.doggybeachhouse.com/rewards" value="%s" />',
        isset($_POST['wipa_url']) ? esc_attr(esc_url_raw(wp_unslash((string) $_POST['wipa_url']))) : ''
    );
    echo '<p class="description">' . esc_html__(
        'Pagina die opent wanneer iemand op de melding tikt.',
        'woof-id-push-admin'
    ) . '</p></td></tr>';

    $audience = isset($_POST['wipa_audience'])
        ? sanitize_key(wp_unslash((string) $_POST['wipa_audience']))
        : 'all';

    echo '<tr><th scope="row">' . esc_html__('Doelgroep', 'woof-id-push-admin') . '</th><td>';
    echo '<fieldset>';
    printf(
        '<label><input type="radio" name="wipa_audience" value="all" %s /> %s</label><br />',
        checked($audience, 'all', false),
        esc_html__('Iedereen met push ingeschakeld', 'woof-id-push-admin')
    );
    printf(
        '<label><input type="radio" name="wipa_audience" value="emails" %s /> %s</label>',
        checked($audience, 'emails', false),
        esc_html__('Alleen specifieke e-mailadressen', 'woof-id-push-admin')
    );
    echo '</fieldset></td></tr>';

    $emails_value = isset($_POST['wipa_emails'])
        ? sanitize_textarea_field(wp_unslash((string) $_POST['wipa_emails']))
        : '';
    echo '<tr class="wipa-emails-row"><th scope="row"><label for="wipa_emails">';
    echo esc_html__('E-mailadressen', 'woof-id-push-admin') . '</label></th><td>';
    printf(
        '<textarea name="wipa_emails" id="wipa_emails" class="large-text" rows="4" placeholder="jan@example.com, petra@example.com">%s</textarea>',
        esc_textarea($emails_value)
    );
    echo '<p class="description">' . esc_html__(
        'Komma-, puntkomma- of regelgescheiden. Alleen gebruikers met een Woof ID-account en push ingeschakeld ontvangen de melding.',
        'woof-id-push-admin'
    ) . '</p></td></tr>';

    echo '</table>';

    submit_button(__('Push versturen', 'woof-id-push-admin'), 'primary', 'wipa_send_push');
    echo '</form></div>';
}

function wipa_admin_scripts(string $hook): void
{
    if (!in_array($hook, ['toplevel_page_wipa-send'], true)) {
        return;
    }

    wp_add_inline_script('jquery', <<<'JS'
jQuery(function ($) {
  function toggleEmails() {
    const show = $('input[name="wipa_audience"]:checked').val() === 'emails';
    $('.wipa-emails-row').toggle(show);
  }
  $('input[name="wipa_audience"]').on('change', toggleEmails);
  toggleEmails();
});
JS
    );
}
add_action('admin_enqueue_scripts', 'wipa_admin_scripts');
