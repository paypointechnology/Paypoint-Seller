import type { Metadata } from "next";
import LegalPage, { Section, UL } from "../_components/LegalPage";

export const metadata: Metadata = {
  title: "Terms of Service — Paypoint",
  description:
    "The terms that govern using Paypoint — for sellers creating checkout pages and buyers paying through them.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="8 September 2026"
      intro="These terms govern your use of Paypoint at paypoint.co. Sellers agree to them when creating an account; buyers agree to the buyer sections when paying through a Paypoint checkout. If you do not agree, please do not use the service."
    >
      <Section title="1. What Paypoint is (and isn't)">
        <p>
          Paypoint lets sellers create hosted checkout pages, share them anywhere, and receive
          payment for their products and services. Payments are processed by licensed Nigerian
          payment service providers and settle to the seller&rsquo;s verified bank account
          automatically.
        </p>
        <UL>
          <li>
            <strong>Paypoint is not a bank</strong> and does not provide banking, wallet, or
            deposit services. Money you receive is settled automatically to your own bank
            account.
          </li>
          <li>
            <strong>Paypoint is not a party to the sale.</strong> Every purchase is a contract
            between the buyer and the seller. The seller is solely responsible for the goods and
            services they sell, their quality, delivery, and any refunds.
          </li>
        </UL>
      </Section>

      <Section title="2. Seller accounts and verification">
        <UL>
          <li>You must be at least 18 and provide accurate information at signup and during verification.</li>
          <li>
            Before receiving payments you must complete verification: business registration (CAC),
            owner identity (BVN), and a bank account in a name consistent with your verified
            identity. Providing false verification details is grounds for immediate termination.
          </li>
          <li>You are responsible for keeping your login credentials secure and for all activity on your account.</li>
        </UL>
      </Section>

      <Section title="3. Fees">
        <p>
          Creating an account and checkout pages is free. Paypoint charges a service fee on each
          successful payment, deducted automatically before settlement. The current fee is shown
          in your dashboard and at checkout creation. We may change fees with at least 14
          days&rsquo; notice by email.
        </p>
      </Section>

      <Section title="4. Settlement">
        <p>
          Successful payments are settled to your verified bank account automatically, normally
          within minutes. Settlement timing ultimately depends on payment processors and banks;
          where a settlement is delayed or fails (for example, a closed bank account), we retry
          automatically and notify you if action is needed. Where a payment is reversed, refunded,
          or found to be fraudulent, you must return the corresponding settled amount, and we may
          offset it against future settlements.
        </p>
      </Section>

      <Section title="5. Acceptable use">
        <p>You may not use Paypoint to sell or do any of the following:</p>
        <UL>
          <li>Anything illegal under Nigerian law, including stolen goods, controlled substances, and unlicensed financial products.</li>
          <li>Weapons, counterfeit goods, or fraudulent schemes (including deceptive pre-orders you cannot fulfil).</li>
          <li>Adult content, gambling or betting services, or pyramid/multi-level recruitment schemes.</li>
          <li>Money laundering, terrorist financing, or moving money on behalf of third parties.</li>
          <li>Anything that infringes another person&rsquo;s intellectual property or privacy.</li>
        </UL>
        <p>
          We may suspend or terminate accounts, cancel checkout pages, or withhold settlement of
          suspicious transactions while we investigate, and we report unlawful activity to the
          relevant authorities.
        </p>
      </Section>

      <Section title="6. Buyers">
        <UL>
          <li>Paying on a Paypoint checkout does not create an account. Your payment is processed on the secure page of a licensed payment processor.</li>
          <li>Receipts confirm payment, not delivery. Delivery, quality, and refunds are the seller&rsquo;s responsibility — contact the seller first with any issue.</li>
          <li>If you believe a checkout page is fraudulent, report it to <a href="mailto:support@paypoint.co" className="font-semibold text-[#5F58F4]">support@paypoint.co</a> and we will investigate.</li>
        </UL>
      </Section>

      <Section title="7. Refunds and disputes">
        <p>
          Refund policies are set by each seller. Where a refund is agreed or required, it is
          funded by the seller. Card and bank disputes (chargebacks) follow the rules of the
          payment networks; sellers are responsible for chargeback outcomes on their
          transactions.
        </p>
      </Section>

      <Section title="8. The service">
        <p>
          We work to keep Paypoint available at all times but provide it &ldquo;as is&rdquo;
          without warranties of uninterrupted or error-free operation. We may modify, suspend, or
          discontinue features with reasonable notice where practicable.
        </p>
      </Section>

      <Section title="9. Liability">
        <p>
          To the maximum extent permitted by law, Paypoint is not liable for indirect or
          consequential losses, or for the acts and omissions of sellers, buyers, banks, or
          payment processors. Our total liability for any claim is limited to the service fees
          you paid us in the three months before the event giving rise to the claim. Nothing in
          these terms excludes liability that cannot be excluded under Nigerian law.
        </p>
      </Section>

      <Section title="10. Termination">
        <p>
          You may close your account at any time from your dashboard settings. We may suspend or
          terminate accounts that break these terms. On termination, pending legitimate
          settlements are completed, and records are retained as required by law and our{" "}
          <a href="/privacy" className="font-semibold text-[#5F58F4]">Privacy Policy</a>.
        </p>
      </Section>

      <Section title="11. General">
        <p>
          These terms are governed by the laws of the Federal Republic of Nigeria, and disputes
          are subject to the jurisdiction of Nigerian courts. If any part of these terms is found
          unenforceable, the rest remains in effect. We may update these terms; material changes
          will be notified to sellers by email at least 14 days before they take effect.
        </p>
        <p>
          Questions? Contact{" "}
          <a href="mailto:support@paypoint.co" className="font-semibold text-[#5F58F4]">
            support@paypoint.co
          </a>
          .
        </p>
      </Section>
    </LegalPage>
  );
}
