import { NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
const docClient = DynamoDBDocumentClient.from(client);
const APPOINTMENTS_TABLE = process.env.DYNAMODB_APPOINTMENTS_TABLE || 'ovira-appointments';
const DOCUMENTS_TABLE = process.env.DYNAMODB_DOCUMENTS_TABLE || 'ovira-documents';

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

const DEMO_DOCTORS = [
    {
        doctorId: "dr-001", name: "Dr. Meera Nair",
        specialty: "Gynaecologist and Obstetrician",
        hospital: "Apollo Hospitals, Bannerghatta Road", city: "Bangalore",
    },
    {
        doctorId: "dr-002", name: "Dr. Anita Rao",
        specialty: "Senior Consultant Gynaecologist",
        hospital: "Manipal Hospitals, Old Airport Road", city: "Bangalore",
    },
    {
        doctorId: "dr-003", name: "Dr. Sarah D'Souza",
        specialty: "Reproductive Endocrinologist (PCOS Specialist)",
        hospital: "Cloudnine Hospital, Jayanagar", city: "Bangalore",
    }
];

export async function POST(request: Request) {
    try {
        const { userId, appointmentId } = await request.json();

        if (!userId || !appointmentId) {
            return NextResponse.json({ success: false, error: 'Missing parameters' }, { status: 400 });
        }

        // 1. Fetch appointment
        const apptRes = await docClient.send(new GetCommand({
            TableName: APPOINTMENTS_TABLE,
            Key: { userId, appointmentId }
        }));
        const appointment = apptRes.Item;

        if (!appointment || !appointment.summaryText) {
            return NextResponse.json({ success: false, error: 'Appointment or summary not found' }, { status: 404 });
        }

        // 2. Get Doctor Info
        const doctor = DEMO_DOCTORS.find(d => d.doctorId === appointment.doctorId) || {
            name: appointment.doctorName,
            hospital: appointment.hospital
        };

        // 3. Get Documents List
        const docsRes = await docClient.send(new QueryCommand({
            TableName: DOCUMENTS_TABLE,
            KeyConditionExpression: 'userId = :uid',
            ExpressionAttributeValues: { ':uid': userId }
        }));
        const documents = docsRes.Items || [];

        // 4. Build HTML Email
        const summaryHtml = appointment.summaryText
            .replace(/### (.*)/g, '<h3 style="color: #4B5563; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; margin-top: 24px;">$1</h3>')
            .replace(/\n/g, '<br/>')
            .replace(/- \[(HIGH|MEDIUM|LOW)\] (.*?) pattern: (.*?) \(Flagged for evaluation\)/g, (_match: string, severity: string, type: string, desc: string) => {
                const color = severity === 'HIGH' ? '#EF4444' : severity === 'MEDIUM' ? '#F59E0B' : '#10B981';
                const bg = severity === 'HIGH' ? '#FEE2E2' : severity === 'MEDIUM' ? '#FEF3C7' : '#D1FAE5';
                return `<div style="background: ${bg}; border-left: 4px solid ${color}; padding: 12px; margin: 8px 0; border-radius: 4px;">
                    <strong style="color: ${color}; font-size: 12px; text-transform: uppercase;">${severity} PRIORITY</strong><br/>
                    <strong style="display: block; margin: 4px 0;">${type} Pattern</strong>
                    <span style="font-size: 14px; color: #374151;">${desc}</span>
                </div>`;
            });

        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Inter', system-ui, sans-serif; line-height: 1.5; color: #1F2937; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
        .header { background: #7C3AED; color: white; padding: 32px 24px; text-align: center; }
        .content { padding: 24px; }
        .info-strip { background: #F3F4F6; padding: 12px 24px; font-size: 12px; color: #6B7280; display: flex; justify-content: space-between; }
        .footer { padding: 24px; font-size: 12px; color: #9CA3AF; text-align: center; border-top: 1px solid #E5E7EB; }
        .doc-badge { background: #DBEAFE; color: #1E40AF; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 600; margin-left: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0; font-size: 20px;">Ovira AI Patient Health Summary</h1>
            <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">Clinical Decision Support Tool</p>
        </div>
        
        <div class="info-strip">
            <span>Tracking Period: 12 Months</span>
            <span>Generated: ${new Date().toLocaleDateString()}</span>
        </div>

        <div class="content">
            <p style="font-size: 14px; color: #4B5563; margin-bottom: 24px;">
                Hello <strong>${doctor.name}</strong>,<br/><br/>
                Your patient, <strong>${appointment.userName || 'Priya Sharma'}</strong>, has shared their health tracking summary and relevant documents for your upcoming consultation on <strong>${appointment.date} at ${appointment.time}</strong>.
            </p>

            ${summaryHtml}

            <h3 style="color: #4B5563; border-bottom: 1px solid #E5E7EB; padding-bottom: 8px; margin-top: 32px;">Attached Health Documents</h3>
            <ul style="list-style: none; padding: 0;">
                ${documents.length > 0 ? documents.map(doc => `
                    <li style="padding: 12px; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 8px; margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between;">
                        <span style="font-size: 14px;">${doc.fileName}</span>
                        <span class="doc-badge">${doc.category || 'General'}</span>
                    </li>
                `).join('') : '<li style="color: #9CA3AF; font-style: italic; font-size: 14px;">No external documents shared</li>'}
            </ul>
        </div>

        <div class="footer">
            <p><strong>Medical Disclaimer:</strong> This summary contains self-tracked data from the Ovira AI app. It is not a medical assessment. All observations and flagged patterns are for your professional evaluation only.</p>
            <p style="margin-top: 16px;">&copy; 2025 Ovira AI — Empowering Women's Health Decisions</p>
        </div>
    </div>
</body>
</html>
`;

        // 5. Send Email via SES
        const sendEmailCommand = new SendEmailCommand({
            Source: process.env.SES_FROM_EMAIL,
            Destination: {
                ToAddresses: [process.env.SES_DEMO_DOCTOR_EMAIL || 'demo-doctor@ovira.ai'],
            },
            Message: {
                Subject: {
                    Data: `Health Summary — ${appointment.userName || 'Patient'} — Appointment ${appointment.date}`,
                },
                Body: {
                    Html: {
                        Data: emailHtml,
                    },
                },
            },
        });

        await sesClient.send(sendEmailCommand);

        // 6. Update Appointment
        await docClient.send(new UpdateCommand({
            TableName: APPOINTMENTS_TABLE,
            Key: { userId, appointmentId },
            UpdateExpression: 'SET healthSummarySent = :sent, sentAt = :now',
            ExpressionAttributeValues: {
                ':sent': true,
                ':now': new Date().toISOString(),
            }
        }));

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Error in send-summary:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
