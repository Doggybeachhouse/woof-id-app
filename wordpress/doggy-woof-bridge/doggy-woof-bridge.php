<?php
/**
 * Plugin Name: Doggy Woof Bridge
 * Description: Linkt doggybeachhouse.com naar de Woof ID app (aparte PWA). Raakt woofwallet-mplus niet aan.
 * Version: 0.1.0
 * Author: Doggy Beach House
 * Requires at least: 6.0
 */

if (!defined('ABSPATH')) {
    exit;
}

define('DWB_VERSION', '0.1.0');
define('DWB_OPTION_URL', 'dwb_woof_id_url');

function dwb_default_url(): string
{
    return 'https://woof.doggybeachhouse.com';
}

function dwb_woof_id_url(): string
{
    $url = get_option(DWB_OPTION_URL, dwb_default_url());
    return esc_url(rtrim((string) $url, '/'));
}

function dwb_register_settings(): void
{
    register_setting('dwb_settings', DWB_OPTION_URL, [
        'type' => 'string',
        'sanitize_callback' => 'esc_url_raw',
        'default' => dwb_default_url(),
    ]);

    add_settings_section(
        'dwb_main',
        __('Woof ID koppeling', 'doggy-woof-bridge'),
        function () {
            echo '<p>' . esc_html__(
                'Woof ID draait als aparte app (gratis op Vercel). Deze plugin voegt alleen links toe — geen saldo-sync.',
                'doggy-woof-bridge'
            ) . '</p>';
        },
        'dwb_settings'
    );

    add_settings_field(
        DWB_OPTION_URL,
        __('Woof ID URL', 'doggy-woof-bridge'),
        function () {
            $val = get_option(DWB_OPTION_URL, dwb_default_url());
            printf(
                '<input type="url" class="regular-text" name="%1$s" id="%1$s" value="%2$s" placeholder="%3$s" />',
                esc_attr(DWB_OPTION_URL),
                esc_attr($val),
                esc_attr(dwb_default_url())
            );
        },
        'dwb_settings',
        'dwb_main'
    );
}
add_action('admin_init', 'dwb_register_settings');

function dwb_admin_menu(): void
{
    add_options_page(
        __('Woof ID Bridge', 'doggy-woof-bridge'),
        __('Woof ID Bridge', 'doggy-woof-bridge'),
        'manage_options',
        'dwb-settings',
        function () {
            if (!current_user_can('manage_options')) {
                return;
            }
            echo '<div class="wrap"><h1>' . esc_html__('Woof ID Bridge', 'doggy-woof-bridge') . '</h1>';
            echo '<form method="post" action="options.php">';
            settings_fields('dwb_settings');
            do_settings_sections('dwb_settings');
            submit_button();
            echo '</form></div>';
        }
    );
}
add_action('admin_menu', 'dwb_admin_menu');

function dwb_account_menu_item(array $items): array
{
    $url = dwb_woof_id_url();
    if (!$url) {
        return $items;
    }

    $new = [];
    foreach ($items as $endpoint => $label) {
        $new[$endpoint] = $label;
        if ($endpoint === 'woof-wallet') {
            $new['woof-id'] = __('Woof ID', 'doggy-woof-bridge');
        }
    }
    if (!isset($new['woof-id'])) {
        $new['woof-id'] = __('Woof ID', 'doggy-woof-bridge');
    }
    return $new;
}
add_filter('woocommerce_account_menu_items', 'dwb_account_menu_item');

function dwb_account_endpoint(): void
{
    $url = dwb_woof_id_url();
    echo '<div class="woocommerce">';
    echo '<h2>' . esc_html__('Woof ID', 'doggy-woof-bridge') . '</h2>';
    echo '<p>' . esc_html__(
        'Maak een hondprofiel aan, check in bij de winkel en verdien Woof Coins.',
        'doggy-woof-bridge'
    ) . '</p>';
    if ($url) {
        printf(
            '<p><a class="button" href="%1$s" target="_blank" rel="noopener noreferrer">%2$s</a></p>',
            esc_url($url),
            esc_html__('Open Woof ID', 'doggy-woof-bridge')
        );
    }
    echo '<p class="description">' . esc_html__(
        'Woof Wallet (saldo) blijft op de bestaande Woof Wallet-pagina.',
        'doggy-woof-bridge'
    ) . '</p>';
    echo '</div>';
}

function dwb_register_endpoint(): void
{
    add_rewrite_endpoint('woof-id', EP_ROOT | EP_PAGES);
}
add_action('init', 'dwb_register_endpoint');

add_action('woocommerce_account_woof-id_endpoint', 'dwb_account_endpoint');

function dwb_flush_rewrites(): void
{
    dwb_register_endpoint();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'dwb_flush_rewrites');
