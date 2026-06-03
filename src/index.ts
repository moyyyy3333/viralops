#!/usr/bin/env node
// ────────────────────────────────────────────────
// ViralOps CLI — AI Marketing Agent Team
// One command to viral content automation
// ────────────────────────────────────────────────

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import dayjs from 'dayjs';
import { PipelineOrchestrator } from './orchestrator.js';
import { config } from './config.js';
import logger from './logger.js';
import type { AgentType, PipelineRun } from './types.js';

const program = new Command();

program
  .name('viralops')
  .description('AI Marketing Agent Team — One command to viral content automation')
  .version('1.0.0');

// ── RUN command ──

program
  .command('run')
  .description('Execute the viral content pipeline')
  .option('-n, --niche <niche>', 'Content niche to research', config.defaultNiche)
  .option('-a, --agent <agent>', 'Run specific agent only (research|clip|edit|post|finance)')
  .option('-p, --platforms <platforms>', 'Target platforms (comma-separated)', 'tiktok,twitter,youtube')
  .option('--dry-run', 'Simulate without posting', false)
  .option('-l, --loop', 'Run continuously (loop mode)', false)
  .option('-i, --interval <seconds>', 'Seconds between runs in loop mode', '300')
  .action(async (options: {
    niche: string;
    agent?: string;
    platforms: string;
    dryRun: boolean;
  }) => {
    // Print banner
    console.log(chalk.bold.cyan('\n  ██╗   ██╗██╗██████╗  █████╗ ██╗      ██████╗ ██████╗ ███████╗'));
    console.log(chalk.bold.cyan('  ██║   ██║██║██╔══██╗██╔══██╗██║     ██╔═══██╗██╔══██╗██╔════╝'));
    console.log(chalk.bold.cyan('  ██║   ██║██║██████╔╝███████║██║     ██║   ██║██████╔╝███████╗'));
    console.log(chalk.bold.cyan('  ╚██╗ ██╔╝██║██╔══██╗██╔══██║██║     ██║   ██║██╔═══╝ ╚════██║'));
    console.log(chalk.bold.cyan('   ╚████╔╝ ██║██║  ██║██║  ██║███████╗╚██████╔╝██║     ███████║'));
    console.log(chalk.bold.cyan('    ╚═══╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝     ╚══════╝'));
    console.log(chalk.gray('  AI Marketing Agent Team — v1.0.0\n'));

    // Validate agent option
    const validAgents: AgentType[] = ['research', 'clip', 'edit', 'post', 'finance'];
    if (options.agent && !validAgents.includes(options.agent as AgentType)) {
      console.error(chalk.red(`  Error: Invalid agent "${options.agent}". Valid: ${validAgents.join(', ')}`));
      process.exit(1);
    }

    const spinner = ora({
      text: chalk.yellow('Initializing pipeline...'),
      spinner: 'dots',
    }).start();

    const orchestrator = new PipelineOrchestrator();
    spinner.succeed(chalk.green('Pipeline initialized'));

    // Show config summary
    console.log(chalk.blue('\n  Configuration:'));
    console.log(`  • Niche: ${chalk.white(options.niche)}`);
    console.log(`  • Platforms: ${chalk.white(options.platforms)}`);
    if (options.agent) {
      console.log(`  • Agent Filter: ${chalk.yellow(options.agent)}`);
    }
    console.log(`  • Dry Run: ${options.dryRun ? chalk.yellow('YES') : chalk.green('NO')}`);
    console.log(`  • Loop: ${options.loop ? chalk.green('ON (every ' + options.interval + 's)') : chalk.yellow('OFF')}`);
    console.log(`  • Claude: ${config.hasAnthropic ? chalk.green('ONLINE') : chalk.red('OFFLINE')}`);
    console.log(`  • Supabase: ${config.hasSupabase ? chalk.green('CONNECTED') : chalk.yellow('LOCAL')}`);
    console.log(`  • Stripe: ${config.hasStripe ? chalk.green('ONLINE') : chalk.yellow('MOCK')}`);
    console.log('');

    const runSpinner = ora({
      text: chalk.yellow(`Running pipeline${options.agent ? ` (agent: ${options.agent})` : ''}...`),
      spinner: 'dots',
    }).start();

    try {
      const result: PipelineRun = await orchestrator.runPipeline({
        niche: options.niche,
        platforms: options.platforms.split(','),
        dryRun: options.dryRun,
      });

      runSpinner.succeed(chalk.green('Pipeline complete!'));

      // Print results table
      const table = new Table({
        head: [chalk.bold('Metric'), chalk.bold('Value')],
        style: { head: ['cyan'] },
      });

      const duration = result.completedAt
        ? ((result.completedAt.getTime() - result.startedAt.getTime()) / 1000).toFixed(1) + 's'
        : 'N/A';

      const statusColor = result.status === 'complete' ? chalk.green : chalk.red;

      table.push(
        ['Status', statusColor(result.status)],
        ['Run ID', result.id],
        ['Duration', duration],
        ['Tasks', result.tasks.length.toString()],
        ['Niche', result.niche],
      );
      console.log(table.toString());

      // Print task breakdown table
      if (result.tasks.length > 0) {
        const taskTable = new Table({
          head: [chalk.bold('Agent'), chalk.bold('Status'), chalk.bold('Duration'), chalk.bold('Retries')],
          style: { head: ['cyan'] },
        });

        for (const task of result.tasks) {
          const statusColorMap: Record<string, (s: string) => string> = {
            complete: chalk.green,
            running: chalk.yellow,
            pending: chalk.gray,
            failed: chalk.red,
            retrying: chalk.magenta,
          };
          const colorFn = statusColorMap[task.status] ?? chalk.white;
          const duration = task.completedAt && task.startedAt
            ? ((task.completedAt.getTime() - task.startedAt.getTime()) / 1000).toFixed(1) + 's'
            : 'N/A';
          taskTable.push([
            task.agentId,
            colorFn(task.status),
            duration,
            `${task.retries}/${task.maxRetries}`,
          ]);
        }
        console.log('\n' + taskTable.toString());
      }

      // Print cost report
      const costReport = orchestrator.getCostReport();
      console.log(chalk.blue('\n  Cost Report:'));
      console.log(chalk.gray(`    Claude tokens: ${costReport.totalTokens.toLocaleString()}`));
      console.log(chalk.gray(`    Compute time: ${(costReport.totalDurationMs / 1000).toFixed(1)}s`));
      if (Object.keys(costReport.perAgent).length > 0) {
        console.log(chalk.gray('    Per-agent:'));
        for (const [id, cost] of Object.entries(costReport.perAgent)) {
          console.log(chalk.gray(`      ${id}: ${cost.tokens.toLocaleString()} tokens | ${(cost.durationMs / 1000).toFixed(1)}s`));
        }
      }

      console.log(chalk.green('\n  ✓ Done! Run ID:'), chalk.cyan(result.id));
      console.log('');

      // Loop mode
      if (options.loop) {
        const intervalMs = parseInt(options.interval, 10) * 1000;
        console.log(chalk.blue(`\n  🔄 Loop mode: next run in ${options.interval}s...`));
        console.log(chalk.gray(`  Press Ctrl+C to stop\n`));
        
        let runCount = 1;
        while (true) {
          await new Promise(r => setTimeout(r, intervalMs));
          runCount++;
          const loopSpinner = ora({ text: chalk.yellow(`Run #${runCount}...`), spinner: 'dots' }).start();
          try {
            await orchestrator.runPipeline({
              niche: options.niche,
              platforms: options.platforms.split(','),
              dryRun: options.dryRun,
            });
            loopSpinner.succeed(chalk.green(`Run #${runCount} complete`));
            console.log(chalk.blue(`  🔄 Next run in ${options.interval}s...`));
          } catch (err) {
            loopSpinner.fail(chalk.red(`Run #${runCount} failed: ${(err as Error).message}`));
            console.log(chalk.blue(`  🔄 Retrying in ${options.interval}s...`));
          }
        }
      }

    } catch (error) {
      runSpinner.fail(chalk.red(`Pipeline failed: ${(error as Error).message}`));
      process.exit(1);
    }
  });

// ── STATUS command ──

program
  .command('status')
  .description('Check pipeline status')
  .action(async () => {
    const orchestrator = new PipelineOrchestrator();
    const run = orchestrator.getCurrentRun();

    if (run) {
      const table = new Table({
        head: [chalk.bold('Property'), chalk.bold('Value')],
        style: { head: ['cyan'] },
      });

      const statusColor = run.status === 'running' ? chalk.yellow
        : run.status === 'complete' ? chalk.green
        : run.status === 'error' ? chalk.red
        : chalk.gray;

      const duration = run.completedAt
        ? ((run.completedAt.getTime() - run.startedAt.getTime()) / 1000).toFixed(1) + 's'
        : ((Date.now() - run.startedAt.getTime()) / 1000).toFixed(1) + 's (ongoing)';

      table.push(
        ['Run ID', run.id],
        ['Status', statusColor(run.status)],
        ['Niche', run.niche],
        ['Started', dayjs(run.startedAt).format('YYYY-MM-DD HH:mm:ss')],
        ['Duration', duration],
        ['Tasks Total', run.tasks.length.toString()],
        ['Tasks Complete', run.tasks.filter(t => t.status === 'complete').length.toString()],
        ['Tasks Failed', run.tasks.filter(t => t.status === 'failed').length.toString()],
      );

      console.log(chalk.blue('\n  Current Pipeline:'));
      console.log(table.toString());

      if (run.errorMessage) {
        console.log(chalk.red(`\n  Error: ${run.errorMessage}`));
      }

      // Task detail table
      if (run.tasks.length > 0) {
        const taskTable = new Table({
          head: [chalk.bold('Agent'), chalk.bold('Status'), chalk.bold('Task ID')],
          style: { head: ['cyan'] },
        });
        for (const task of run.tasks) {
          const sc = task.status === 'complete' ? chalk.green
            : task.status === 'running' ? chalk.yellow
            : task.status === 'failed' ? chalk.red
            : chalk.gray;
          taskTable.push([task.agentId, sc(task.status), task.id]);
        }
        console.log('\n  ' + taskTable.toString());
      }
    } else {
      console.log(chalk.yellow('\n  No active pipeline. Start one with:'));
      console.log(chalk.cyan('    npx tsx src/index.ts run\n'));
    }
  });

// ── LOGS command ──

program
  .command('logs')
  .description('View pipeline logs')
  .option('-r, --run-id <id>', 'Filter by run ID')
  .option('-t, --tail <n>', 'Number of recent logs', '50')
  .action(async (options: {
    runId?: string;
    tail: string;
  }) => {
    const orchestrator = new PipelineOrchestrator();

    if (!options.runId) {
      console.log(chalk.yellow('\n  No --run-id specified. Use:'));
      console.log(chalk.cyan('    npx tsx src/index.ts logs --run-id <id> --tail 50\n'));
      return;
    }

    const limit = parseInt(options.tail, 10);
    if (isNaN(limit) || limit < 1) {
      console.error(chalk.red('  Error: --tail must be a positive number'));
      process.exit(1);
    }

    const spinner = ora({ text: chalk.yellow('Fetching logs...'), spinner: 'dots' }).start();
    const logs = await orchestrator.getRecentLogs(options.runId, limit);
    spinner.stop();

    if (logs.length === 0) {
      console.log(chalk.yellow(`\n  No logs found for run ${options.runId}\n`));
      return;
    }

    console.log(chalk.blue(`\n  Showing ${logs.length} log(s) for run ${options.runId}:\n`));

    const logTable = new Table({
      head: [chalk.bold('Time'), chalk.bold('Agent'), chalk.bold('Level'), chalk.bold('Message')],
      style: { head: ['cyan'] },
      wordWrap: true,
      colWidths: [22, 12, 10, null],
    });

    for (const log of logs) {
      const createdAt = log.created_at ? dayjs(String(log.created_at)).format('HH:mm:ss MM/DD') : 'N/A';
      const agentId = String(log.agent_id ?? 'system');
      const level = String(log.level ?? 'info');
      const message = String(log.message ?? '');

      const levelColor = level === 'error' ? chalk.red
        : level === 'warn' ? chalk.yellow
        : level === 'debug' ? chalk.gray
        : chalk.white;

      logTable.push([createdAt, agentId, levelColor(level), message]);
    }

    console.log(logTable.toString() + '\n');
  });

// ── ANALYTICS command ──

program
  .command('analytics')
  .description('View pipeline analytics and cost breakdown')
  .action(async () => {
    const orchestrator = new PipelineOrchestrator();
    const report = orchestrator.getCostReport();

    console.log(chalk.bold.cyan('\n  ViralOps Analytics\n'));

    // Cost summary table
    const table = new Table({
      head: [chalk.bold('Metric'), chalk.bold('Value')],
      style: { head: ['cyan'] },
    });

    table.push(
      ['Total Tokens Used', report.totalTokens.toLocaleString()],
      ['Total Compute Time', `${(report.totalDurationMs / 1000).toFixed(1)}s`],
      ['Active Agents', `${Object.keys(report.perAgent).length}`],
    );
    console.log(table.toString());

    // Per-agent breakdown
    if (Object.keys(report.perAgent).length > 0) {
      const agentTable = new Table({
        head: [chalk.bold('Agent'), chalk.bold('Tokens'), chalk.bold('Duration'), chalk.bold('API Calls')],
        style: { head: ['cyan'] },
      });
      for (const [id, cost] of Object.entries(report.perAgent)) {
        agentTable.push([
          id,
          cost.tokens.toLocaleString(),
          `${(cost.durationMs / 1000).toFixed(1)}s`,
          String((cost as Record<string, unknown>).apiCalls ?? 'N/A'),
        ]);
      }
      console.log('\n' + agentTable.toString());
    }

    // External services
    const services = Object.entries(report.perService);
    if (services.length > 0) {
      const svcTable = new Table({
        head: [chalk.bold('Service'), chalk.bold('Duration (ms)')],
        style: { head: ['cyan'] },
      });
      for (const [svc, ms] of services) {
        svcTable.push([svc, ms.toLocaleString()]);
      }
      console.log('\n' + svcTable.toString());
    }

    console.log('');
  });

// ── SETUP command ──

program
  .command('setup')
  .description('Setup database tables and environment')
  .action(async () => {
    console.log(chalk.bold.cyan('\n  ViralOps Setup\n'));

    const spinner = ora({ text: chalk.yellow('Checking configuration...'), spinner: 'dots' }).start();

    // Config check table
    const configTable = new Table({
      head: [chalk.bold('Service'), chalk.bold('Status'), chalk.bold('Config Key')],
      style: { head: ['cyan'] },
    });

    configTable.push(
      ['Anthropic (Claude)', config.hasAnthropic ? chalk.green('OK') : chalk.yellow('NOT SET'), 'ANTHROPIC_API_KEY'],
      ['Supabase DB', config.hasSupabase ? chalk.green('OK') : chalk.yellow('NOT SET'), 'SUPABASE_URL + SUPABASE_SERVICE_KEY'],
      ['Perplexity', config.hasPerplexity ? chalk.green('OK') : chalk.yellow('NOT SET'), 'PERPLEXITY_API_KEY'],
      ['Stripe', config.hasStripe ? chalk.green('OK') : chalk.yellow('NOT SET'), 'STRIPE_SECRET_KEY'],
      ['X / Twitter', config.hasX ? chalk.green('OK') : chalk.yellow('NOT SET'), 'X_API_KEY + X_ACCESS_TOKEN'],
      ['YouTube', config.hasYouTube ? chalk.green('OK') : chalk.yellow('NOT SET'), 'YOUTUBE_API_KEY'],
      ['TikTok', config.hasTikTok ? chalk.green('OK') : chalk.yellow('NOT SET'), 'TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET'],
    );

    spinner.succeed(chalk.green('Configuration checked'));
    console.log('\n  ' + configTable.toString());

    console.log(chalk.blue('\n  Required for full pipeline:'));
    console.log('    ' + chalk.green('●') + ' ANTHROPIC_API_KEY  — powers all AI agents');
    console.log('    ' + chalk.yellow('○') + ' SUPABASE_*         — persistent storage (optional)');
    console.log('    ' + chalk.yellow('○') + ' PERPLEXITY_API_KEY — viral topic research (optional)');
    console.log('    ' + chalk.yellow('○') + ' STRIPE_SECRET_KEY  — revenue tracking (optional)');

    console.log(chalk.blue('\n  Platform API keys (for auto-posting):'));
    console.log('    ' + chalk.yellow('○') + ' X_API_KEY + X_ACCESS_TOKEN');
    console.log('    ' + chalk.yellow('○') + ' YOUTUBE_API_KEY');
    console.log('    ' + chalk.yellow('○') + ' TIKTOK_CLIENT_KEY + TIKTOK_CLIENT_SECRET');

    console.log(chalk.green('\n  Setup complete. Run the pipeline:'));
    console.log(chalk.cyan('    npx tsx src/index.ts run'));
    console.log(chalk.cyan('    npx tsx src/index.ts run --niche "AI technology"'));
    console.log(chalk.cyan('    npx tsx src/index.ts run --dry-run\n'));
  });

// ── YOUTUBE-AUTH command ──

program
  .command('youtube-auth')
  .description('One-time YouTube OAuth setup — opens browser for authorization')
  .action(async () => {
    console.log(chalk.bold.blue('\n  YouTube OAuth Setup\n'));

    const { YouTubeAPIService } = await import('./services/youtubeApi.js');
    const stubLogger = { info: console.log, warn: console.warn, error: console.error, debug: console.log, child: () => stubLogger } as any;
    const yt = new YouTubeAPIService(stubLogger);

    console.log(chalk.yellow('  Opening browser for Google authorization...'));
    console.log(chalk.gray('  Log in with the Google account that owns the YouTube channel.\n'));

    const spin = ora({ text: 'Waiting for authorization...', spinner: 'dots' }).start();

    try {
      await yt.authenticate();
      spin.succeed(chalk.green('YouTube authorized! Tokens saved.'));
      console.log(chalk.blue('\n  You can now upload Shorts:'));
      console.log(chalk.cyan('    npx tsx src/index.ts run --platforms "youtube"'));
      console.log('');
    } catch (err) {
      spin.fail(chalk.red(`Auth failed: ${(err as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
