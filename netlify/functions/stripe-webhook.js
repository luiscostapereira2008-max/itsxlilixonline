// netlify/functions/stripe-webhook.js
// (no repo, coloca este ficheiro em: netlify/functions/stripe-webhook.js)
// Recebe o evento 'checkout.session.completed', gera link assinado e envia email via Resend

const Stripe = require('stripe');
const crypto = require('crypto');

exports.handler = async (event) => {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const email = session.customer_details && session.customer_details.email;
    const name = (session.customer_details && session.customer_details.name) || '';

    if (!email) {
      console.error('No email in session');
      return { statusCode: 400, body: 'No email' };
    }

    // assina email com ACCESS_SECRET (HMAC) — para ter signature anti-tampering no link
    const sig = crypto
      .createHmac('sha256', process.env.ACCESS_SECRET)
      .update(email.toLowerCase())
      .digest('hex')
      .slice(0, 16);

    const link = `${process.env.DOMAIN}/curso?e=${encodeURIComponent(email)}&s=${sig}`;

    // envia email via Resend
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ItsXliLix <help@onlineincitsxlilix.com>',
          reply_to: 'luiscostapereira2008@gmail.com',
          to: [email],
          subject: 'O teu acesso ao manual ItsXliLix',
          // Plain-text alternative — exigida por bons spam filters (Gmail, Outlook).
          // Emails só-HTML são penalizados; com ambos a entrega é muito melhor.
          text: `Obrigada${name ? ', ' + name.split(' ')[0] : ''}.

O teu acesso ao manual ItsXliLix está pronto. É vitalício e pessoal.

Acede aqui (guarda nos favoritos):
${link}

Este link tem o teu email associado e aparece visível dentro do curso. Não partilhes — se for partilhado, vamos saber quem foi.

Dúvidas? Responde a este email.
Reembolso até 7 dias após a compra — basta pedir.

—
ItsXliLix · Manual
help@onlineincitsxlilix.com`,
          html: `
            <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px;color:#14110b">
              <h1 style="font-family:Georgia,serif;font-weight:400;font-size:28px;margin:0 0 18px;letter-spacing:-0.5px">Obrigada${name ? ', ' + name.split(' ')[0] : ''}.</h1>
              <p style="line-height:1.6;color:#4d4538;font-size:15px">O teu acesso ao manual está pronto. É <strong>vitalício</strong> e <strong>pessoal</strong> — guarda este link nos favoritos:</p>
              <p style="margin:24px 0">
                <a href="${link}" style="display:inline-block;background:#6e1c2e;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px">Aceder ao manual</a>
              </p>
              <p style="color:#857c6f;font-size:13px;line-height:1.5;border-top:1px solid #ebe7dc;padding-top:18px;margin-top:32px">
                Este link tem o teu email associado e aparece visível dentro do curso. <strong>Não partilhes.</strong> Se for partilhado vamos saber quem foi.
              </p>
              <p style="color:#857c6f;font-size:13px;line-height:1.5">
                Dúvidas? Responde a este email.<br>
                Reembolso até 7 dias após a compra — basta pedir.
              </p>
              <p style="color:#b3aa9b;font-size:11px;margin-top:32px;letter-spacing:0.5px;text-transform:uppercase">ItsXliLix · Manual</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error('Resend error:', errText);
        return { statusCode: 500, body: 'Email send failed' };
      }
    } catch (err) {
      console.error('Email fetch error:', err);
      return { statusCode: 500, body: 'Email send error' };
    }

    return { statusCode: 200, body: JSON.stringify({ received: true, email }) };
  }

  // outros eventos
  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
