// utils/email-templates.js
function jobApprovedTemplate({ job, companyName }) {
  const title = job.title || 'Your job post';
  return {
    subject: `Your job "${title}" has been approved`,
    html: `
      <p>Hello ${companyName || 'Employer'},</p>
      <p>Your job posting <strong>${title}</strong> has been <strong>approved</strong> and is now live on Career Platform.</p>
      <p><strong>Job details</strong>:<br/>
      ${job.description ? `<div style="max-width:640px">${job.description}</div>` : '—'}</p>
      <p>Best regards,<br/>Career Platform Team</p>
    `
  };
}

function jobRejectedTemplate({ job, companyName, reason }) {
  const title = job.title || 'Your job post';
  return {
    subject: `Your job "${title}" was rejected`,
    html: `
      <p>Hello ${companyName || 'Employer'},</p>
      <p>We reviewed your job posting <strong>${title}</strong>. Unfortunately it was <strong>rejected</strong>.</p>
      <p><strong>Reason</strong>: ${reason || 'Not specified'}</p>
      <p>If you believe this was a mistake, please contact support or edit and re-submit your job post.</p>
      <p>Best regards,<br/>Career Platform Team</p>
    `
  };
}

module.exports = { jobApprovedTemplate, jobRejectedTemplate };
