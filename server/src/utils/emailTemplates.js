// HTML + plain-text bodies for AquaTrack's transactional emails.
const ROLE_LABEL = {
  fishpond_owner: 'Fishpond Owner',
  agriculture_staff: 'Agriculture Office Staff',
  admin: 'Administrator',
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function layout(title, bodyHtml) {
  return `<!doctype html>
<html><body style="margin:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#1e293b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden">
        <tr><td style="background:#1c6e6e;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:bold">AquaTrack</td></tr>
        <tr><td style="padding:28px">
          <h1 style="margin:0 0 14px;font-size:20px;color:#0f172a">${title}</h1>
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f8fafc;color:#94a3b8;font-size:12px">
          AquaTrack — Aquaculture Monitoring System. If you did not expect this email, you can ignore it.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function otpEmail({ name, otp, minutes }) {
  const html = layout(
    'Verify your email',
    `<p style="margin:0 0 16px;line-height:1.6">Hi ${escapeHtml(name)}, use this code to verify your AquaTrack account:</p>
     <p style="margin:0 0 16px;text-align:center">
       <span style="display:inline-block;padding:14px 22px;background:#eaf5f4;border-radius:12px;font-size:32px;letter-spacing:10px;font-weight:bold;color:#134a4a">${otp}</span>
     </p>
     <p style="margin:0;line-height:1.6;color:#64748b">This code expires in ${minutes} minutes. Never share it with anyone.</p>`
  );
  const text = `Hi ${name},\n\nYour AquaTrack verification code is: ${otp}\n\nIt expires in ${minutes} minutes. Never share it with anyone.`;
  return { subject: `${otp} is your AquaTrack verification code`, html, text };
}

function accountCreatedEmail({ name, email, role, tempPassword, loginUrl, isReset = false }) {
  const intro = isReset
    ? 'An administrator reset the password for your AquaTrack account.'
    : `An administrator created an AquaTrack account for you as <b>${escapeHtml(ROLE_LABEL[role] || role)}</b>.`;
  const html = layout(
    isReset ? 'Your password was reset' : 'Your AquaTrack account is ready',
    `<p style="margin:0 0 16px;line-height:1.6">Hi ${escapeHtml(name)}, ${intro}</p>
     <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 18px;background:#f8fafc;border-radius:12px">
       <tr><td style="padding:14px 18px;font-size:14px;line-height:1.8">
         <b>Email:</b> ${escapeHtml(email)}<br>
         <b>Temporary password:</b> <span style="font-family:Consolas,monospace;font-size:16px;color:#134a4a">${escapeHtml(tempPassword)}</span>
       </td></tr>
     </table>
     <p style="margin:0 0 20px;line-height:1.6">You will be asked to set a new password the first time you sign in.</p>
     <p style="margin:0;text-align:center">
       <a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:12px 26px;background:#1c6e6e;color:#ffffff;text-decoration:none;border-radius:10px;font-weight:bold">Sign in to AquaTrack</a>
     </p>`
  );
  const text = `Hi ${name},\n\n${isReset ? 'An administrator reset the password for your AquaTrack account.' : `An administrator created an AquaTrack account for you as ${ROLE_LABEL[role] || role}.`}\n\nEmail: ${email}\nTemporary password: ${tempPassword}\n\nYou will be asked to set a new password the first time you sign in: ${loginUrl}`;
  return { subject: isReset ? 'Your AquaTrack password was reset' : 'Your AquaTrack account is ready', html, text };
}

module.exports = { otpEmail, accountCreatedEmail };
