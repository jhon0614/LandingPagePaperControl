/*
=========================================================
LÍMITE DE 72 BYTES UTF-8
=========================================================

Algunos algoritmos de hashing (como bcrypt) truncan
silenciosamente las contraseñas más largas de 72 bytes.

Como caracteres especiales, tildes o emojis pueden ocupar
más de 1 byte en UTF-8, no basta con contar caracteres:
hay que contar bytes reales.
*/

export function excedeLimiteBytesUtf8(valor) {

    return new TextEncoder().encode(valor || "").length > 72;

}