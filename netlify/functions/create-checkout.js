// netlify/functions/create-checkout.js
// (no repo, coloca este ficheiro em: netlify/functions/create-checkout.js)
// Checkout simples na conta Stripe da empresa da Lilix.
// Luís recebe a sua % por recibo verde mensal — não há split automático.

const Stripe = require('stripe');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  try {
    const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

    // ─────── PRICING ───────
    // Cliente paga o total. Toda a receita entra na conta Stripe da empresa.
    // IVA / TVA é responsabilidade da empresa vendedora (declara no país dela).
    // Ajustar o PRICE_GROSS consoante a taxa do país da empresa
    // (PT 23%, FR 20%, CH 8.1%, BE 21%). Valor actual: €60 base + 23%.
    const PRICE_GROSS = 7380; // €73,80 — total cobrado ao cliente

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      // Métodos de pagamento aceites. TÊM de estar activados também no
      // Stripe Dashboard → Settings → Payment methods, senão dão erro.
      // Para adicionar mais (ex: 'klarna', 'link', 'sepa_debit'),
      // ativa primeiro no dashboard e depois adiciona aqui.
      payment_method_types: ['card', 'mb_way', 'multibanco'],
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: PRICE_GROSS,
          product_data: {
            name: 'ItsXliLix — Constrói o teu income online',
            description: 'Manual prático · 12 módulos · Acesso vitalício',
          },
        },
        quantity: 1,
      }],
      payment_intent_data: {
        description: 'ItsXliLix manual',
      },
      customer_creation: 'always',
      billing_address_collection: 'auto',
      success_url: `${process.env.DOMAIN}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.DOMAIN}/`,
      allow_promotion_codes: false,
      metadata: {
        product: 'itsxlilix_manual_v1',
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: session.url, id: session.id }),
    };
  } catch (err) {
    console.error('Stripe error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
