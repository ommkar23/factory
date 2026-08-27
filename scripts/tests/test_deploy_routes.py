import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
import sys
SCRIPTS = Path(__file__).resolve().parents[1]; sys.path.insert(0, str(SCRIPTS))
from deploy.process import Runner
from deploy.routes import Routes, reserved_ports
from deploy.state import DeploymentState

class FakeRunner(Runner):
    def __init__(self, serve='{}'): self.commands=[]; self.serve=serve
    def run(self, command, **kwargs):
        from subprocess import CompletedProcess
        self.commands.append(command.args)
        output = self.serve if command.args[:3] == ('tailscale','serve','status') else ('{"Self":{"DNSName":"node.ts.net."}}' if command.args[:2] == ('tailscale','status') else '')
        return CompletedProcess(command.args, 0, output, '')

class RouteTests(unittest.TestCase):
    def test_records_ownership_before_alias_mutation(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory); path=root/'.hermes/runtime/deploy/home/state.json'; runner=FakeRunner(); state=DeploymentState('home','id','project','alias','url','32100')
            Routes(root,runner,path).register(state,False)
            self.assertTrue(path.exists()); self.assertIn(('portless','alias','alias','32100','--force'),runner.commands)
    def test_cleanup_preserves_foreign_tailscale_target(self):
        with tempfile.TemporaryDirectory() as directory:
            state=DeploymentState('home','id','project','alias','url','1','12000','http://owned','','')
            serve=json.dumps({'TCP':{'12000':{'HTTPS':True}},'Web':{'node.ts.net:12000':{'Handlers':{'/':{'Proxy':'http://foreign'}}}}})
            runner=FakeRunner(serve)
            with patch('deploy.routes.shutil.which',return_value='/bin/tailscale'):
                Routes(Path(directory),runner,Path(directory)/'state').remove(state)
            self.assertNotIn(('tailscale','serve','--https=12000','off'),runner.commands)

if __name__=='__main__': unittest.main()
