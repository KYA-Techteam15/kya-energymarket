import { useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { m } from '@/paraglide/messages.js';
import { getLocale } from '@/paraglide/runtime.js';
import { revokeMcpClient, type getMcpAdmin } from './server';

type McpAdmin = NonNullable<Awaited<ReturnType<typeof getMcpAdmin>>>;

function CopyBox({ value, testId }: { value: string; testId?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="keybox">
      <code data-testid={testId}>{value}</code>
      <button
        className="btn btn-line btn-sm"
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(value);
          setCopied(true);
        }}
      >
        {copied ? m.copied() : m.copy()}
      </button>
    </div>
  );
}

/** Administration « MCP » (spec 003, histoire 4) : adresse, guide de connexion, clients autorisés. */
export function McpAdminPage({ admin }: { admin: McpAdmin }) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const date = new Intl.DateTimeFormat(getLocale(), { dateStyle: 'long' });

  const revoke = async (id: string) => {
    const result = await revokeMcpClient({ data: { id } });
    if (result.ok) setNotice(m.admin_mcp_revoked());
    await router.invalidate();
  };

  return (
    <>
      <header className="acct-head">
        <div>
          <h1>{m.admin_mcp()}.</h1>
          <p>{m.admin_mcp_intro()}</p>
        </div>
      </header>

      <section className="box" aria-labelledby="t-mcp-url">
        <div className="box-head">
          <h2 id="t-mcp-url">{m.admin_mcp_url()}</h2>
        </div>
        <div className="box-body">
          <CopyBox value={admin.serverUrl} testId="mcp-url" />
        </div>
      </section>

      <section className="box" aria-labelledby="t-mcp-how">
        <div className="box-head">
          <h2 id="t-mcp-how">{m.admin_mcp_how()}</h2>
        </div>
        <div className="box-body">
          <p>{m.admin_mcp_claude()}</p>
          <p style={{ marginTop: 18 }}>{m.admin_mcp_claude_code()}</p>
          <CopyBox value={`claude mcp add --transport http kya-energy-market ${admin.serverUrl}`} />
          <p style={{ marginTop: 18 }}>{m.admin_mcp_codex()}</p>
          <CopyBox value={`codex mcp add kya-energy-market --url ${admin.serverUrl}`} />
          <CopyBox value="codex mcp login kya-energy-market" />
          <h3 className="h3" style={{ marginTop: 28, fontSize: '1rem' }}>
            {m.admin_mcp_tools()}
          </h3>
          <ul style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            <li>
              <code>whoami</code> — {m.admin_mcp_tool_whoami()}
            </li>
            <li>
              <code>list_staff</code> — {m.admin_mcp_tool_list_staff()}
            </li>
            <li>
              <code>find_customer</code> — {m.admin_mcp_tool_find_customer()}
            </li>
            <li>
              <code>search_catalog</code>, <code>get_product</code> — {m.admin_mcp_tool_catalog()}
            </li>
            <li>
              <code>update_product</code>, <code>update_edition</code>, <code>set_plan_price</code> —{' '}
              {m.admin_mcp_tool_catalog_write()}
            </li>
            <li>
              <code>list_pages</code>, <code>get_page</code> — {m.admin_mcp_tool_pages()}
            </li>
            <li>
              <code>update_page_draft</code>, <code>publish_page</code> — {m.admin_mcp_tool_pages_write()}
            </li>
          </ul>
        </div>
      </section>

      <section className="box" aria-labelledby="t-mcp-clients">
        <div className="box-head">
          <h2 id="t-mcp-clients">{m.admin_mcp_connections()}</h2>
        </div>
        <div className="box-body">
          {notice ? (
            <p className="form-ok" role="status" style={{ marginBottom: 16 }}>
              {notice}
            </p>
          ) : null}
          {admin.connections.length === 0 ? (
            <p>{m.admin_mcp_none()}</p>
          ) : (
            <table className="tbl">
              <tbody>
                {admin.connections.map((connection) => (
                  <tr key={connection.id}>
                    <td>
                      <b>{connection.clientName}</b>
                      <br />
                      <small className="muted">
                        {m.admin_mcp_since({ date: date.format(new Date(connection.createdAt)) })}
                      </small>
                    </td>
                    <td>
                      {connection.scopes.map((scope) => (
                        <span key={scope} className="chip" style={{ marginRight: 6 }}>
                          {scope}
                        </span>
                      ))}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button className="btn btn-line btn-sm" type="button" onClick={() => void revoke(connection.id)}>
                        {m.admin_mcp_revoke()}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </>
  );
}
