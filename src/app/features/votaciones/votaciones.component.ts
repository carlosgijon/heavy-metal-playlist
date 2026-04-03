import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Dialog } from '@angular/cdk/dialog';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroPlus, heroTrash, heroChevronLeft, heroCheck, heroXMark,
  heroHandThumbUp, heroArrowPath, heroLockClosed, heroArchiveBox,
  heroLockOpen, heroPencil,
} from '@ng-icons/heroicons/outline';
import { DatabaseService } from '../../core/services/database.service';
import { ToastService } from '../../core/services/toast.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog/confirm-dialog.component';
import {
  Poll, PollType, PollStatus, PollResults, YesNoResults, OptionResults,
  POLL_TYPE_LABELS, POLL_TYPE_BADGE, POLL_STATUS_LABELS, POLL_STATUS_BADGE,
} from '../../core/models/poll.model';
import { BandMember } from '../../core/models/equipment.model';
import { Gig } from '../../core/models/gig.model';
import { PollFormComponent, PollFormData } from './poll-form/poll-form.component';
import { CreatePollDto } from '../../core/models/poll.model';

type TabFilter = 'open' | 'closed' | 'all';

@Component({
  selector: 'app-votaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({
    heroPlus, heroTrash, heroChevronLeft, heroCheck, heroXMark,
    heroHandThumbUp, heroArrowPath, heroLockClosed, heroArchiveBox,
    heroLockOpen, heroPencil,
  })],
  template: `
  <div class="page-container">

    <!-- ── List view ─────────────────────────────────────────────────── -->
    @if (!selectedPoll()) {

      <div class="page-header">
        <div>
          <h1 class="page-title">Votaciones</h1>
          <p class="page-subtitle">Decisiones democráticas del grupo</p>
        </div>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-sm gap-1" (click)="openCreateForm()">
            <ng-icon name="heroPlus" size="16" /> Nueva votación
          </button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="tabs tabs-boxed mb-4 w-fit">
        <button class="tab" [class.tab-active]="tab() === 'open'"   (click)="tab.set('open')">Abiertas</button>
        <button class="tab" [class.tab-active]="tab() === 'closed'" (click)="tab.set('closed')">Cerradas</button>
        <button class="tab" [class.tab-active]="tab() === 'all'"    (click)="tab.set('all')">Todas</button>
      </div>

      <!-- Poll cards -->
      @if (loading()) {
        <div class="flex justify-center py-16">
          <span class="loading loading-spinner loading-md"></span>
        </div>
      } @else if (filteredPolls().length === 0) {
        <div class="flex flex-col items-center justify-center py-20 opacity-40 gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.5" class="w-12 h-12">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4"/>
          </svg>
          <p class="text-sm">No hay votaciones {{ tabEmptyLabel() }}</p>
        </div>
      } @else {
        <div class="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          @for (poll of filteredPolls(); track poll.id) {
            <div class="card card-bordered bg-base-100 hover:bg-base-200 cursor-pointer transition-colors"
                 (click)="selectPoll(poll)">
              <div class="card-body p-4 gap-2">
                <!-- Badges row -->
                <div class="flex flex-wrap gap-1.5">
                  <span class="badge badge-sm" [ngClass]="typeBadge[poll.type]">
                    {{ typeLabels[poll.type] }}
                  </span>
                  <span class="badge badge-sm" [ngClass]="statusBadge[poll.status]">
                    {{ statusLabels[poll.status] }}
                  </span>
                  @if (poll.linkedGig) {
                    <span class="badge badge-sm badge-ghost">🎸 {{ poll.linkedGig.title }}</span>
                  }
                </div>
                <!-- Title -->
                <h3 class="font-semibold text-sm leading-snug">{{ poll.title }}</h3>
                @if (poll.description) {
                  <p class="text-xs opacity-55 line-clamp-2">{{ poll.description }}</p>
                }
                <!-- Footer -->
                <div class="flex items-center justify-between mt-1">
                  <span class="text-xs opacity-50">Por {{ poll.createdBy }}</span>
                  <div class="flex items-center gap-2">
                    @if (poll.deadline) {
                      <span class="text-xs opacity-50">⏰ {{ formatDate(poll.deadline) }}</span>
                    }
                    <span class="badge badge-xs badge-ghost">
                      {{ poll.voteCount }} voto{{ poll.voteCount !== 1 ? 's' : '' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          }
        </div>
      }

    } @else {
    <!-- ── Detail view ────────────────────────────────────────────────── -->
    <div>
      <!-- Back + actions header -->
      <div class="flex items-center gap-3 mb-4 flex-wrap">
        <button class="btn btn-ghost btn-sm gap-1" (click)="selectedPoll.set(null)">
          <ng-icon name="heroChevronLeft" size="16" /> Volver
        </button>
        <div class="flex gap-1.5 flex-wrap ml-auto">
          <!-- Status transitions -->
          @if (selectedPoll()!.status === 'draft') {
            <button class="btn btn-sm btn-success gap-1" (click)="setStatus('open')">
              <ng-icon name="heroLockOpen" size="14" /> Abrir votación
            </button>
          }
          @if (selectedPoll()!.status === 'open') {
            <button class="btn btn-sm btn-warning gap-1" (click)="setStatus('closed')">
              <ng-icon name="heroLockClosed" size="14" /> Cerrar
            </button>
          }
          @if (selectedPoll()!.status === 'closed') {
            <button class="btn btn-sm btn-ghost btn-sm gap-1" (click)="setStatus('open')">
              <ng-icon name="heroArrowPath" size="14" /> Reabrir
            </button>
            <button class="btn btn-sm btn-ghost gap-1" (click)="setStatus('archived')">
              <ng-icon name="heroArchiveBox" size="14" /> Archivar
            </button>
          }
          <button class="btn btn-sm btn-ghost text-error gap-1" (click)="deletePoll()">
            <ng-icon name="heroTrash" size="14" /> Eliminar
          </button>
        </div>
      </div>

      <!-- Poll header card -->
      <div class="card card-bordered bg-base-100 mb-4">
        <div class="card-body p-4 gap-1">
          <div class="flex flex-wrap gap-1.5 mb-1">
            <span class="badge" [ngClass]="typeBadge[selectedPoll()!.type]">{{ typeLabels[selectedPoll()!.type] }}</span>
            <span class="badge" [ngClass]="statusBadge[selectedPoll()!.status]">{{ statusLabels[selectedPoll()!.status] }}</span>
            @if (selectedPoll()!.linkedGig) {
              <span class="badge badge-ghost">🎸 {{ selectedPoll()!.linkedGig!.title }}</span>
            }
          </div>
          <h2 class="text-lg font-bold">{{ selectedPoll()!.title }}</h2>
          @if (selectedPoll()!.description) {
            <p class="text-sm opacity-60">{{ selectedPoll()!.description }}</p>
          }
          <div class="flex gap-4 mt-1 text-xs opacity-50 flex-wrap">
            <span>Creada por {{ selectedPoll()!.createdBy }}</span>
            @if (selectedPoll()!.deadline) {
              <span>⏰ Fecha límite: {{ formatDate(selectedPoll()!.deadline!) }}</span>
            }
            <span>{{ selectedPoll()!.voteCount }} voto{{ selectedPoll()!.voteCount !== 1 ? 's' : '' }}</span>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <!-- ── LEFT: Voting panel ──────────────────────────────────────── -->
        <div>
          <h3 class="font-semibold text-sm mb-2 opacity-70 uppercase tracking-wide">Votar</h3>

          @if (selectedPoll()!.status !== 'open') {
            <div class="alert alert-warning text-sm py-2 px-3">
              <ng-icon name="heroLockClosed" size="14" />
              La votación está {{ statusLabels[selectedPoll()!.status].toLowerCase() }}.
              @if (selectedPoll()!.status === 'draft') { Ábrela para empezar. }
            </div>
          } @else {

            <!-- Voter name selector -->
            <div class="form-control mb-3">
              <label class="label py-1"><span class="label-text text-xs">¿Quién vota?</span></label>
              <select class="select select-bordered select-sm" [(ngModel)]="voterName">
                <option value="">— Selecciona tu nombre —</option>
                @for (m of members(); track m.id) {
                  <option [value]="m.name">{{ m.name }}</option>
                }
              </select>
            </div>

            <!-- YES/NO -->
            @if (selectedPoll()!.type === 'yes_no') {
              <div class="flex gap-2 flex-wrap mb-3">
                <button class="btn flex-1 gap-2"
                        [class.btn-success]="myYesNoVote === 'yes'"
                        [class.btn-outline]="myYesNoVote !== 'yes'"
                        (click)="myYesNoVote = 'yes'">
                  <ng-icon name="heroCheck" size="16" /> Sí
                </button>
                <button class="btn flex-1 gap-2"
                        [class.btn-error]="myYesNoVote === 'no'"
                        [class.btn-outline]="myYesNoVote !== 'no'"
                        (click)="myYesNoVote = 'no'">
                  <ng-icon name="heroXMark" size="16" /> No
                </button>
                <button class="btn flex-1 gap-2"
                        [class.btn-ghost]="myYesNoVote !== 'abstain'"
                        [class.btn-active]="myYesNoVote === 'abstain'"
                        (click)="myYesNoVote = 'abstain'">
                  Me abstengo
                </button>
              </div>
              <div class="form-control mb-3">
                <textarea class="textarea textarea-bordered textarea-sm" [(ngModel)]="voteComment"
                          rows="2" placeholder="Comentario opcional..."></textarea>
              </div>
              <button class="btn btn-primary btn-sm w-full gap-1"
                      [disabled]="!voterName || !myYesNoVote"
                      (click)="castYesNoVote()">
                <ng-icon name="heroHandThumbUp" size="14" /> Enviar voto
              </button>
            }

            <!-- APPROVAL / PROPOSAL -->
            @if (selectedPoll()!.type === 'approval' || selectedPoll()!.type === 'proposal') {

              @if (selectedPoll()!.type === 'proposal') {
                <!-- Add proposal input -->
                <div class="flex gap-2 mb-3">
                  <input type="text" class="input input-bordered input-sm flex-1"
                         [(ngModel)]="newOptionText"
                         placeholder="Tu propuesta..." />
                  <button class="btn btn-sm btn-ghost gap-1"
                          [disabled]="!newOptionText.trim() || !voterName"
                          (click)="addOption()">
                    <ng-icon name="heroPlus" size="14" /> Proponer
                  </button>
                </div>
              }

              @if (selectedPoll()!.options.length === 0) {
                <p class="text-sm opacity-40 text-center py-4">
                  @if (selectedPoll()!.type === 'proposal') { Sé el primero en proponer algo. }
                  @else { No hay opciones aún. }
                </p>
              } @else {
                <div class="flex flex-col gap-1.5 mb-3">
                  @for (opt of selectedPoll()!.options; track opt.id) {
                    <label class="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-base-200 transition-colors">
                      <input type="checkbox" class="checkbox checkbox-sm checkbox-primary"
                             [checked]="myApprovedIds.has(opt.id)"
                             (change)="toggleApproval(opt.id)" />
                      <span class="text-sm flex-1">{{ opt.text }}</span>
                      @if (opt.proposedBy) {
                        <span class="text-xs opacity-40">{{ opt.proposedBy }}</span>
                      }
                      @if (selectedPoll()!.status === 'open' && opt.proposedBy === voterName) {
                        <button class="btn btn-ghost btn-xs text-error" (click)="deleteOption(opt.id); $event.preventDefault()">
                          <ng-icon name="heroTrash" size="12" />
                        </button>
                      }
                    </label>
                  }
                </div>
                <div class="form-control mb-3">
                  <textarea class="textarea textarea-bordered textarea-sm" [(ngModel)]="voteComment"
                            rows="2" placeholder="Comentario opcional..."></textarea>
                </div>
                <button class="btn btn-primary btn-sm w-full gap-1"
                        [disabled]="!voterName"
                        (click)="castApprovalVote()">
                  <ng-icon name="heroHandThumbUp" size="14" /> Enviar voto
                </button>
              }
            }
          }
        </div>

        <!-- ── RIGHT: Results panel ───────────────────────────────────── -->
        <div>
          <h3 class="font-semibold text-sm mb-2 opacity-70 uppercase tracking-wide">Resultados</h3>

          @if (!results()) {
            <div class="flex justify-center py-10">
              <span class="loading loading-spinner loading-sm"></span>
            </div>
          } @else if (isYesNoResults(results()!)) {
            <!-- YES/NO results -->
            @let r = asYesNo(results()!);
            <div class="card bg-base-200 p-4 rounded-xl mb-3">
              <div class="flex flex-col gap-2">
                <!-- Sí -->
                <div>
                  <div class="flex justify-between text-sm mb-0.5">
                    <span class="text-success font-medium">✓ Sí</span>
                    <span>{{ r.yes }} ({{ r.yesPct }}%)</span>
                  </div>
                  <progress class="progress progress-success w-full" [value]="r.yesPct" max="100"></progress>
                </div>
                <!-- No -->
                <div>
                  <div class="flex justify-between text-sm mb-0.5">
                    <span class="text-error font-medium">✗ No</span>
                    <span>{{ r.no }} ({{ r.noPct }}%)</span>
                  </div>
                  <progress class="progress progress-error w-full" [value]="r.noPct" max="100"></progress>
                </div>
                <!-- Abstención -->
                <div>
                  <div class="flex justify-between text-sm mb-0.5">
                    <span class="opacity-60">Abstención</span>
                    <span>{{ r.abstain }} ({{ r.abstainPct }}%)</span>
                  </div>
                  <progress class="progress w-full" [value]="r.abstainPct" max="100"></progress>
                </div>
              </div>
              <div class="text-xs opacity-50 mt-2">Total: {{ r.total }} voto{{ r.total !== 1 ? 's' : '' }}</div>
            </div>
            <!-- Voter breakdown -->
            @if (r.voters.length > 0) {
              <div class="flex flex-col gap-1">
                @for (v of r.voters; track v.voterName) {
                  <div class="flex items-center gap-2 text-sm">
                    <span class="font-medium w-24 truncate flex-shrink-0">{{ v.voterName }}</span>
                    @if (v.value === 'yes') {
                      <span class="badge badge-success badge-sm">Sí</span>
                    } @else if (v.value === 'no') {
                      <span class="badge badge-error badge-sm">No</span>
                    } @else {
                      <span class="badge badge-ghost badge-sm">Abstención</span>
                    }
                    @if (v.comment) {
                      <span class="text-xs opacity-50 truncate">{{ v.comment }}</span>
                    }
                  </div>
                }
              </div>
            }

          } @else if (results()) {
            <!-- APPROVAL / PROPOSAL results -->
            @let r = asOptions(results()!);
            <div class="text-xs opacity-50 mb-2">{{ r.totalVoters }} votante{{ r.totalVoters !== 1 ? 's' : '' }}</div>
            @if (r.options.length === 0) {
              <p class="text-sm opacity-40 text-center py-6">Aún no hay votos.</p>
            } @else {
              @let maxVotes = r.options[0].voteCount || 1;
              <div class="flex flex-col gap-2">
                @for (opt of r.options; track opt.id; let i = $index) {
                  <div class="rounded-lg p-3 bg-base-200">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold"
                            [class.bg-warning]="i === 0"
                            [class.text-warning-content]="i === 0"
                            [class.bg-base-300]="i !== 0">
                        {{ i + 1 }}
                      </span>
                      <span class="text-sm font-medium flex-1">{{ opt.text }}</span>
                      <span class="text-xs font-bold">{{ opt.voteCount }}</span>
                    </div>
                    <progress class="progress progress-primary w-full h-1.5"
                              [value]="opt.voteCount" [max]="maxVotes"></progress>
                    @if (opt.proposedBy) {
                      <div class="text-xs opacity-40 mt-0.5">por {{ opt.proposedBy }}</div>
                    }
                  </div>
                }
              </div>
            }
          }
        </div>

      </div>
    </div>
    }

  </div>
  `,
})
export class VotacionesComponent implements OnInit {
  private db     = inject(DatabaseService);
  private toast  = inject(ToastService);
  private dialog = inject(Dialog);

  readonly typeLabels  = POLL_TYPE_LABELS;
  readonly typeBadge   = POLL_TYPE_BADGE;
  readonly statusLabels = POLL_STATUS_LABELS;
  readonly statusBadge  = POLL_STATUS_BADGE;

  loading      = signal(true);
  polls        = signal<Poll[]>([]);
  members      = signal<BandMember[]>([]);
  gigs         = signal<Gig[]>([]);
  selectedPoll = signal<Poll | null>(null);
  results      = signal<PollResults | null>(null);
  tab          = signal<TabFilter>('open');

  // Voting state
  voterName     = '';
  myYesNoVote   = '';
  myApprovedIds = new Set<string>();
  voteComment   = '';
  newOptionText = '';

  filteredPolls = computed(() => {
    const t = this.tab();
    return this.polls().filter(p => {
      if (t === 'open')   return p.status === 'open' || p.status === 'draft';
      if (t === 'closed') return p.status === 'closed' || p.status === 'archived';
      return true;
    });
  });

  tabEmptyLabel = computed(() => {
    const t = this.tab();
    if (t === 'open')   return 'abiertas';
    if (t === 'closed') return 'cerradas';
    return '';
  });

  async ngOnInit(): Promise<void> {
    await this.loadAll();
  }

  private async loadAll(): Promise<void> {
    this.loading.set(true);
    try {
      const [polls, members, gigs] = await Promise.allSettled([
        this.db.getPolls(),
        this.db.getMembers(),
        this.db.getGigs(),
      ]);
      if (polls.status    === 'fulfilled') this.polls.set(polls.value);
      if (members.status  === 'fulfilled') this.members.set(members.value);
      if (gigs.status     === 'fulfilled') this.gigs.set((gigs.value as Gig[]).filter(g => g.date));
    } catch { this.toast.danger('Error al cargar votaciones'); }
    finally { this.loading.set(false); }
  }

  async selectPoll(poll: Poll): Promise<void> {
    this.selectedPoll.set(poll);
    this.resetVoteState();
    await this.loadResults(poll.id);
  }

  private async loadResults(pollId: string): Promise<void> {
    this.results.set(null);
    try {
      this.results.set(await this.db.getPollResults(pollId));
    } catch { /* non-critical */ }
  }

  private resetVoteState(): void {
    this.voterName     = '';
    this.myYesNoVote   = '';
    this.myApprovedIds = new Set();
    this.voteComment   = '';
    this.newOptionText = '';
  }

  openCreateForm(): void {
    const ref = this.dialog.open<CreatePollDto>(PollFormComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { members: this.members(), gigs: this.gigs() } satisfies PollFormData,
    });
    ref.closed.subscribe(async dto => {
      if (!dto) return;
      try {
        await this.db.createPoll(dto);
        this.toast.success(`"${dto.title}" creada`);
        await this.loadAll();
      } catch (e: any) { this.toast.danger(e ?? 'Error al crear'); }
    });
  }

  async setStatus(status: PollStatus): Promise<void> {
    const poll = this.selectedPoll();
    if (!poll) return;
    try {
      const updated = await this.db.setPollStatus(poll.id, status);
      this.selectedPoll.set(updated);
      this.polls.update(list => list.map(p => p.id === updated.id ? updated : p));
      this.toast.success(`Votación ${this.statusLabels[status].toLowerCase()}`);
      if (status === 'open' || status === 'closed') await this.loadResults(poll.id);
    } catch (e: any) { this.toast.danger(e ?? 'Error'); }
  }

  deletePoll(): void {
    const poll = this.selectedPoll();
    if (!poll) return;
    const ref = this.dialog.open<boolean>(ConfirmDialogComponent, {
      hasBackdrop: true, backdropClass: 'cdk-overlay-dark-backdrop', disableClose: true,
      data: { title: 'Eliminar votación', message: `¿Eliminar "${poll.title}"?`, confirmLabel: 'Eliminar' } satisfies ConfirmDialogData,
    });
    ref.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      try {
        await this.db.deletePoll(poll.id);
        this.toast.warning(`"${poll.title}" eliminada`);
        this.selectedPoll.set(null);
        await this.loadAll();
      } catch (e: any) { this.toast.danger(e ?? 'Error'); }
    });
  }

  toggleApproval(optionId: string): void {
    const s = new Set(this.myApprovedIds);
    if (s.has(optionId)) s.delete(optionId); else s.add(optionId);
    this.myApprovedIds = s;
  }

  async castYesNoVote(): Promise<void> {
    const poll = this.selectedPoll();
    if (!poll || !this.voterName || !this.myYesNoVote) return;
    try {
      const updated = await this.db.castPollVote(poll.id, {
        voterName: this.voterName,
        value:     this.myYesNoVote,
        comment:   this.voteComment || undefined,
      });
      this.selectedPoll.set(updated);
      this.polls.update(list => list.map(p => p.id === updated.id ? updated : p));
      this.toast.success('Voto enviado');
      this.voteComment = '';
      await this.loadResults(poll.id);
    } catch (e: any) { this.toast.danger(e ?? 'Error al votar'); }
  }

  async castApprovalVote(): Promise<void> {
    const poll = this.selectedPoll();
    if (!poll || !this.voterName) return;
    try {
      const updated = await this.db.castPollVote(poll.id, {
        voterName:        this.voterName,
        approvedOptionIds: [...this.myApprovedIds],
        comment:          this.voteComment || undefined,
      });
      this.selectedPoll.set(updated);
      this.polls.update(list => list.map(p => p.id === updated.id ? updated : p));
      this.toast.success('Voto enviado');
      this.voteComment = '';
      await this.loadResults(poll.id);
    } catch (e: any) { this.toast.danger(e ?? 'Error al votar'); }
  }

  async addOption(): Promise<void> {
    const poll = this.selectedPoll();
    if (!poll || !this.newOptionText.trim() || !this.voterName) return;
    try {
      await this.db.addPollOption(poll.id, this.newOptionText.trim(), this.voterName);
      this.newOptionText = '';
      const updated = await this.db.getPoll(poll.id);
      this.selectedPoll.set(updated);
      this.polls.update(list => list.map(p => p.id === updated.id ? updated : p));
    } catch (e: any) { this.toast.danger(e ?? 'Error al añadir opción'); }
  }

  async deleteOption(optionId: string): Promise<void> {
    const poll = this.selectedPoll();
    if (!poll) return;
    try {
      await this.db.deletePollOption(poll.id, optionId);
      const updated = await this.db.getPoll(poll.id);
      this.selectedPoll.set(updated);
      await this.loadResults(poll.id);
    } catch (e: any) { this.toast.danger(e ?? 'Error'); }
  }

  formatDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  // Type guards for template
  isYesNoResults(r: PollResults): r is YesNoResults {
    return r.type === 'yes_no';
  }
  asYesNo(r: PollResults): YesNoResults {
    return r as YesNoResults;
  }
  asOptions(r: PollResults): OptionResults {
    return r as OptionResults;
  }
}
