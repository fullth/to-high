import { ProblemController } from './problem.controller';
import { BudgetAlertService } from '../../common/budget-alert.service';

describe('problem report', () => {
  it('accepts only a fixed report and exposes no user content', async () => {
    const reportProblem = jest.fn().mockResolvedValue('pending');
    const controller = new ProblemController({
      reportProblem,
    } as unknown as BudgetAlertService);
    await expect(controller.report()).resolves.toEqual({ state: 'pending' });
    expect(reportProblem).toHaveBeenCalledWith();
  });
  it('does not claim acceptance when reporting fails', async () => {
    const controller = new ProblemController({
      reportProblem: jest.fn().mockRejectedValue(new Error('unavailable')),
    } as unknown as BudgetAlertService);
    await expect(controller.report()).rejects.toThrow();
  });
  it('reports when the hourly alert was already sent', async () => {
    const controller = new ProblemController({
      reportProblem: jest.fn().mockResolvedValue('sent'),
    } as unknown as BudgetAlertService);
    await expect(controller.report()).resolves.toEqual({ state: 'sent' });
  });
});
