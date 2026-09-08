import type { Metadata } from "next";
import LegalPage, { Section, UL } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Privacy Policy — Paypoint",
  description:
    "How Paypoint collects, uses, and protects your information — for sellers and their buyers.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="8 September 2026"
      intro="Paypoint helps businesses create checkout pages and get paid. To do that, we handle personal information belonging to two groups of people: sellers (who create Paypoint accounts) and buyers (who pay through a seller's checkout page). This policy explains what we collect from each, why, and the choices you have. It is written to comply with the Nigeria Data Protection Act (NDPA) 2023."
    >
      <Section title="1. Who we are">
        <p>
          Paypoint (&ldquo;we&rdquo;, &ldquo;us&rdquo;) operates paypoint.co. We are the data
          controller for the personal information described in this policy. For any privacy
          question or request, contact us at{" "}
          <a href="mailto:privacy@paypoint.co" className="font-semibold text-[#5F58F4]">
            privacy@paypoint.co
          </a>
          .
        </p>
      </Section>

      <Section title="2. Information we collect from sellers">
        <UL>
          <li>
            <strong>Account details</strong> — your name, email address, password (stored only as
            a secure hash), and WhatsApp business number.
          </li>
          <li>
            <strong>Business details</strong> — business name, logo, brand colour, and the
            products or services you list.
          </li>
          <li>
            <strong>Verification details</strong> — your CAC registration number (RC or BN) and
            the registered business name returned by the Corporate Affairs Commission registry;
            and your Bank Verification Number (BVN), which is checked once through a licensed
            identity-verification provider and{" "}
            <strong>never stored by Paypoint</strong> — we keep only the last four digits and the
            verification result.
          </li>
          <li>
            <strong>Settlement details</strong> — your bank account number and the account name
            confirmed by your bank, used solely to send you your money.
          </li>
          <li>
            <strong>Transaction records</strong> — payments received on your checkout pages.
          </li>
        </UL>
      </Section>

      <Section title="3. Information we collect from buyers">
        <p>
          Buyers do not create accounts. When you pay through a seller&rsquo;s checkout page, we
          collect the details the seller needs to fulfil your order: your name, and (where the
          seller requests them) your phone number, email address, and delivery address — plus the
          transaction record itself.
        </p>
        <p>
          <strong>Your card and bank details never touch Paypoint.</strong> Payment is completed
          on the secure page of a licensed payment processor; we receive only confirmation that
          payment succeeded.
        </p>
        <p>
          We keep buyer contact and delivery details for <strong>90 days</strong> after the
          transaction, after which they are deleted from our systems. Transaction records
          (amounts, references, dates) are kept longer as required for financial record-keeping.
        </p>
      </Section>

      <Section title="4. How we use information">
        <UL>
          <li>To provide the service: hosting checkout pages, confirming payments, sending money to sellers, and issuing receipts.</li>
          <li>To verify sellers&rsquo; identity and business registration, as required for fraud prevention and know-your-customer (KYC) compliance.</li>
          <li>To notify you: payment confirmations, receipts, and important account emails.</li>
          <li>To keep the platform safe: detecting fraud, abuse, and unlawful activity.</li>
          <li>To meet legal obligations under Nigerian law.</li>
        </UL>
        <p>We do not sell personal information. We do not use buyer information for advertising.</p>
      </Section>

      <Section title="5. Who we share information with">
        <p>We share information only with the service providers needed to run Paypoint:</p>
        <UL>
          <li>
            <strong>Licensed payment service providers</strong> — to process payments and settle
            money to sellers&rsquo; bank accounts.
          </li>
          <li>
            <strong>Licensed identity-verification providers</strong> — to verify CAC
            registrations, BVNs, and bank accounts.
          </li>
          <li>
            <strong>Infrastructure providers</strong> — secure cloud hosting and database
            services (our database is hosted in the European Union) and our transactional email
            provider.
          </li>
          <li>
            <strong>Sellers and buyers, to each other</strong> — a seller sees the order details a
            buyer submits; a buyer sees the seller&rsquo;s business name and contact details.
          </li>
          <li>
            <strong>Authorities</strong> — where Nigerian law requires it.
          </li>
        </UL>
      </Section>

      <Section title="6. Security">
        <p>
          All traffic to Paypoint is encrypted (HTTPS). Access to personal data is restricted by
          row-level database security, and sensitive identifiers are minimised — for example, we
          never store full BVNs. No system is perfectly secure, but we design ours so that the
          most sensitive information simply isn&rsquo;t held by us at all.
        </p>
      </Section>

      <Section title="7. Your rights (NDPA)">
        <p>Under the Nigeria Data Protection Act, you may:</p>
        <UL>
          <li>Request a copy of the personal information we hold about you.</li>
          <li>Ask us to correct inaccurate information.</li>
          <li>Ask us to delete your information, subject to legal record-keeping duties.</li>
          <li>Object to or restrict certain processing.</li>
          <li>Complain to the Nigeria Data Protection Commission.</li>
        </UL>
        <p>
          To exercise any of these, email{" "}
          <a href="mailto:privacy@paypoint.co" className="font-semibold text-[#5F58F4]">
            privacy@paypoint.co
          </a>{" "}
          — we respond within 30 days.
        </p>
      </Section>

      <Section id="cookies" title="8. Cookies">
        <p>
          Paypoint uses only <strong>essential cookies</strong>: they keep sellers signed in and
          keep the service secure. We do not use advertising or cross-site tracking cookies. If
          we ever introduce analytics cookies, we will update this policy and ask for consent
          where required.
        </p>
      </Section>

      <Section title="9. Changes to this policy">
        <p>
          When we change this policy, we&rsquo;ll update the date at the top and, for material
          changes, notify sellers by email. Continued use of Paypoint after a change means you
          accept the updated policy.
        </p>
      </Section>
    </LegalPage>
  );
}
