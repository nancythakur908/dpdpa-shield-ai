export async function sendEmail(to: string, subject: string, text: string) {
  const apiKey = Deno.env.get('RESEND_API_KEY'); const from = Deno.env.get('RESEND_FROM_EMAIL');
  if (!apiKey || !from) return { delivered: false, reason: 'Email provider is not configured.' };
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to, subject, text }) });
  if (!response.ok) throw new Error(`Email provider rejected delivery: ${await response.text()}`);
  return { delivered: true };
}
