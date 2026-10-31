# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/settings/viewWorkspaceList.test.ts >> BK-87: Validate the Settings workspace list >> BK-791: should list each workspace with name, role, active indicator and member count
- Location: tests/e2e/settings/viewWorkspaceList.test.ts:16:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('workspaces-list').getByRole('heading', { name: 'My Workspaces' })
Expected: visible
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 10000ms
  - waiting for getByTestId('workspaces-list').getByRole('heading', { name: 'My Workspaces' })

```

```yaml
- complementary:
  - text: 分 Bunkai
  - button "Team chat"
  - button "Notifications, 7 unread": "7"
  - link "New project":
    - /url: /projects/new
  - button "BA Bunkai QA Automation"
  - button "Search or jump to… ⌘ K"
  - navigation:
    - link "Home":
      - /url: /home
    - link "Activity":
      - /url: /activity
    - link "Projects 3":
      - /url: /projects
    - link "ATC Library 47":
      - /url: /atcs
    - text: Test Runs soon Bug Reports soon Metrics soon
    - link "Settings":
      - /url: /settings
  - text: Pinned projects
  - link "NEWP New Project Example QA2":
    - /url: /projects/new-project-example-qa2
  - link "BK33 BK-337 Project B (QA fixture)":
    - /url: /projects/bk337-project-b-qa
  - link "BK46 BK-46 W3 Coverage Fixture":
    - /url: /projects/bk-46-w3-coverage-fixture
  - button "BA bunkai-auto-owner-ec8c39@delgri.resend.app Owner"
- navigation "Settings sections":
  - link "Back to app":
    - /url: /projects
  - text: Available
  - link "Account":
    - /url: /settings/account
  - link "Tokens":
    - /url: /settings/tokens
  - link "Workspaces":
    - /url: /settings/workspaces
  - link "Notifications":
    - /url: /settings/notifications
  - link "Billing":
    - /url: /settings/billing
  - link "Data export":
    - /url: /settings/data-export
  - text: Coming soon Members soon Environments soon
- heading "Account" [level=1]
- paragraph: Your identity and workspaces in Bunkai.
- heading "Identity" [level=2]
- text: bunkai-auto-owner-ec8c39@delgri.resend.app Role in active workspace Owner bunkai-qa-auto-ec8c39 · Bunkai QA Automation Member since 2026-06-29 Last active 2026-10-31 04:58 UTC
- region "Workspaces":
  - heading "Workspaces" [level=2]
  - text: 4 workspaces Bunkai QA Automation bunkai-qa-auto-ec8c39 Owner active 3 members BK-337 Admin Role (QA fixture) bk337-admin-role-qa Admin 1 member BK-337 Viewer Role (QA fixture) bk337-viewer-role-qa Viewer 1 member QA Team S5 qa-team-s5 Owner 3 members
- region "Notifications alt+T"
- alert
```

# Test source

```ts
  58  |   activeSlug: string
  59  | }
  60  | 
  61  | // ============================================
  62  | // Settings Page Component
  63  | // ============================================
  64  | 
  65  | export class SettingsPage extends UiBase {
  66  |   constructor(options: TestContextOptions) {
  67  |     super(options);
  68  |   }
  69  | 
  70  |   // ============================================
  71  |   // Helpers (no @atc)
  72  |   // ============================================
  73  | 
  74  |   /**
  75  |    * Open Settings > Account and wait until both async sections have settled.
  76  |    * The workspace list streams in through Suspense, so a hidden copy of its
  77  |    * region can coexist with the visible one for a few milliseconds: wait for a
  78  |    * visible region first, then for the hidden copy to go away.
  79  |    */
  80  |   @step
  81  |   async gotoAccount(): Promise<void> {
  82  |     await this.page.goto(this.buildUrl('/settings/account'));
  83  |     await expect(this.page.getByTestId('identity-card')).toBeVisible();
  84  |     const list = this.page.getByTestId('workspaces-list');
  85  |     await expect(list.filter({ visible: true })).toBeVisible();
  86  |     await expect(list).toHaveCount(1);
  87  |     await expect(this.page.getByTestId('workspaces-rows')).toBeVisible();
  88  |   }
  89  | 
  90  |   /** Helper: list the caller's workspaces with the browser session (cookie), role included. */
  91  |   @step
  92  |   async listMyWorkspaces(): Promise<WorkspaceListItem[]> {
  93  |     const response = await this.page.request.get(this.buildUrl('/api/v1/workspaces'));
  94  |     expect(response.status()).toBe(200);
  95  |     const body = await response.json() as { workspaces: WorkspaceListItem[] };
  96  |     return body.workspaces;
  97  |   }
  98  | 
  99  |   /** Helper: make a workspace the active one for this browser session. */
  100 |   @step
  101 |   async selectWorkspace(workspaceId: string): Promise<void> {
  102 |     const response = await this.page.request.post(this.buildUrl('/api/v1/me/active-workspace'), {
  103 |       data: { workspace_id: workspaceId },
  104 |     });
  105 |     expect(response.status(), `switching the active workspace to ${workspaceId}`).toBe(200);
  106 |   }
  107 | 
  108 |   // ============================================
  109 |   // ATCs - Complete Test Cases
  110 |   // ============================================
  111 | 
  112 |   /**
  113 |    * ATC: The identity card shows the email and the role of the active workspace
  114 |    *
  115 |    * For each workspace given, switches the active workspace to it, opens
  116 |    * Settings > Account and checks the card. The active workspace lives in a
  117 |    * cookie of this browser context, so there is no server state to restore.
  118 |    *
  119 |    * @param args - email and the workspaces (one per role) to check
  120 |    */
  121 |   @atc('BK-790')
  122 |   async viewAccountIdentity(args: IdentityArgs): Promise<void> {
  123 |     for (const workspace of args.workspaces) {
  124 |       await this.selectWorkspace(workspace.id);
  125 |       await this.gotoAccount();
  126 | 
  127 |       const card = this.page.getByTestId('identity-card');
  128 |       // Email is the primary label
  129 |       await expect(card.getByTestId('identity-email'), `email on the ${workspace.role} workspace`).toHaveText(args.email);
  130 |       // Role of the user in the active workspace, with the label of that role
  131 |       const role = card.getByTestId('identity-role');
  132 |       await expect(role, `role label on the ${workspace.role} workspace`).toContainText(roleLabel(workspace.role));
  133 |       await expect(role).toContainText(workspace.slug);
  134 |       // Email-only identity: the card holds no input, so no (empty) display-name field exists
  135 |       await expect(card.getByRole('textbox'), `no input in the card on the ${workspace.role} workspace`).toHaveCount(0);
  136 |     }
  137 |   }
  138 | 
  139 |   /**
  140 |    * ATC: The workspace list shows every workspace with name, role, active indicator and member count
  141 |    *
  142 |    * IMPORTANT: opens the page itself. The caller makes `activeSlug` active first
  143 |    * (selectWorkspace), so the expected active row is known by construction and
  144 |    * is not read back from the page under test.
  145 |    *
  146 |    * The member count is checked for format only ("N member(s)"): the API list
  147 |    * carries no count to compare with.
  148 |    *
  149 |    * @param args - the expected workspaces and the slug that must carry the active indicator
  150 |    */
  151 |   @atc('BK-791')
  152 |   async viewWorkspaceList(args: WorkspaceListArgs): Promise<void> {
  153 |     await this.gotoAccount();
  154 | 
  155 |     const region = this.page.getByTestId('workspaces-list');
  156 |     await expect(region).toBeVisible();
  157 |     // DEMO (Dojoteca Ed.5, RGR-3..RGR-5): expected heading deliberately broken to provoke a labeled failure. Never merge.
> 158 |     await expect(region.getByRole('heading', { name: 'My Workspaces' })).toBeVisible();
      |                                                                          ^ Error: expect(locator).toBeVisible() failed
  159 | 
  160 |     const rows = region.getByTestId('workspaces-rows').locator('[data-testid^="workspace-row-"]');
  161 |     await expect(rows).toHaveCount(args.workspaces.length);
  162 | 
  163 |     for (const workspace of args.workspaces) {
  164 |       const row = region.getByTestId(`workspace-row-${workspace.slug}`);
  165 |       await expect(row).toContainText(workspace.name);
  166 |       await expect(row).toContainText(roleLabel(workspace.role));
  167 |       await expect(row).toContainText(/\d+ members?/);
  168 | 
  169 |       // Only the active workspace carries the indicator
  170 |       const indicator = row.getByTestId(`workspace-active-${workspace.slug}`);
  171 |       if (workspace.slug === args.activeSlug) {
  172 |         await expect(indicator).toHaveText('active');
  173 |       }
  174 |       else {
  175 |         await expect(indicator).toHaveText('');
  176 |       }
  177 |     }
  178 |   }
  179 | 
  180 |   /**
  181 |    * ATC: An anonymous visit to a protected Settings route is redirected to login, keeping the return path
  182 |    *
  183 |    * Run it with an empty storage state (no session).
  184 |    *
  185 |    * @param routes - protected routes to request, one after the other
  186 |    */
  187 |   @atc('BK-793')
  188 |   async openSettingsWithoutSession(routes: string[]): Promise<void> {
  189 |     for (const route of routes) {
  190 |       await this.page.goto(this.buildUrl(route));
  191 |       await expect(this.page, `redirect for ${route}`).toHaveURL(/\/login/);
  192 | 
  193 |       const landed = new URL(this.page.url());
  194 |       expect(landed.pathname, `login path for ${route}`).toBe('/login');
  195 |       expect(landed.searchParams.get('next'), `next parameter for ${route}`).toBe(route);
  196 |     }
  197 |   }
  198 | }
  199 | 
```